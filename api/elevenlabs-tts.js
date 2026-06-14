// api/elevenlabs-tts.js
// รับ { voiceId, text } → return audio/mpeg stream

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });

    const { voiceId, text } = req.body;
    if (!voiceId || !text) return res.status(400).json({ error: 'voiceId and text required' });

    try {
        const elRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.85,
                        style: 0.1,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!elRes.ok) {
            const err = await elRes.json();
            return res.status(elRes.status).json({ error: err.detail?.message || 'TTS failed' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');

        const reader = elRes.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
        }
        res.end();

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}