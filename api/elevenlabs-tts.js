// api/elevenlabs-tts.js
// ใช้ XTTS-v2 ผ่าน Hugging Face Inference API
// รับ { voiceId, text, speakerAudioBase64, speakerAudioMime }
// return audio/wav

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfKey) return res.status(500).json({ error: 'HUGGINGFACE_API_KEY not configured' });

    const { text, speakerAudioBase64, speakerAudioMime } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        // ถ้าไม่มี speaker audio ใช้เสียง default
        if (!speakerAudioBase64) {
            // fallback: ส่ง error กลับไปให้ client ใช้ Web Speech API แทน
            return res.status(400).json({ error: 'No speaker audio — use Web Speech API fallback' });
        }

        // เรียก XTTS-v2 API
        const audioBytes  = Buffer.from(speakerAudioBase64, 'base64');
        const audioBase64Str = speakerAudioBase64;

        const payload = {
            inputs: text,
            parameters: {
                language:          'th',      // ภาษาไทย
                speaker_wav:       audioBase64Str,
                speaker_wav_mime:  speakerAudioMime || 'audio/webm',
            }
        };

        const hfRes = await fetch(
            'https://api-inference.huggingface.co/models/coqui/XTTS-v2',
            {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${hfKey}`,
                    'Content-Type':  'application/json',
                    'x-wait-for-model': 'true',  // รอ model warm up
                },
                body: JSON.stringify(payload),
            }
        );

        if (!hfRes.ok) {
            const errText = await hfRes.text();
            // Model loading (503) — แจ้ง client ให้รอ
            if (hfRes.status === 503) {
                return res.status(503).json({ error: 'Model is loading, please try again in 20 seconds', loading: true });
            }
            return res.status(hfRes.status).json({ error: errText });
        }

        const audioBuffer = await hfRes.arrayBuffer();
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'no-store');
        res.send(Buffer.from(audioBuffer));

    } catch(e) {
        res.status(500).json({ error: e.message });
    }
}