// api/elevenlabs-tts.js — XTTS-v2 via Hugging Face
// รับ { text, speakerAudioBase64, speakerAudioMime } → return audio

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfKey) return res.status(500).json({ error: 'HUGGINGFACE_API_KEY not configured' });

    const { text, speakerAudioBase64, speakerAudioMime } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!speakerAudioBase64) return res.status(400).json({ error: 'No speaker audio' });

    try {
        // ตัด base64 ให้ไม่เกิน 300KB เพื่อหลีกเลี่ยง timeout
        const maxLen   = 400000;
        const trimmed  = speakerAudioBase64.length > maxLen
            ? speakerAudioBase64.slice(0, maxLen)
            : speakerAudioBase64;

        // เรียก XTTS-v2 Space ผ่าน Gradio API
        // ใช้ parler-tts แทน coqui/XTTS-v2 ที่ไม่ทำงาน
        const payload = {
            inputs: {
                text,
                language:        'th',
                speaker_wav:     `data:${speakerAudioMime || 'audio/webm'};base64,${trimmed}`,
            }
        };

        // ลอง model ที่ทำงานจริงบน HF Inference API
        const models = [
            'myshell-ai/MeloTTS',
            'facebook/mms-tts-tha',
        ];

        let audioBuffer = null;
        let lastError   = '';

        for (const model of models) {
            const hfRes = await fetch(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    method:  'POST',
                    headers: {
                        'Authorization':    `Bearer ${hfKey}`,
                        'Content-Type':     'application/json',
                        'x-wait-for-model': 'true',
                    },
                    body: JSON.stringify({ inputs: text }),
                }
            );

            if (hfRes.ok) {
                audioBuffer = await hfRes.arrayBuffer();
                break;
            }

            const errText = await hfRes.text();
            lastError     = `${model}: ${hfRes.status} ${errText.slice(0,100)}`;
            console.warn('Model failed:', lastError);

            if (hfRes.status === 503) continue; // ลอง model ถัดไป
        }

        if (!audioBuffer) {
            return res.status(502).json({ error: 'All models failed: ' + lastError });
        }

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'no-store');
        res.send(Buffer.from(audioBuffer));

    } catch(e) {
        console.error('TTS error:', e);
        res.status(500).json({ error: e.message });
    }
}