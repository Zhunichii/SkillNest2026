// api/elevenlabs-tts.js — ElevenLabs TTS (voice library, ไม่ต้อง clone)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });

    const { text, voiceId } = req.body;
    if (!text || !voiceId) return res.status(400).json({ error: 'text and voiceId required' });

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
                    },
                }),
            }
        );

        if (!elRes.ok) {
            const err = await elRes.json().catch(() => ({}));
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
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
}