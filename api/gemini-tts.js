// api/gemini-tts.js — Gemini Speech (TTS) สำหรับเสียงอาจารย์ Avatar AI
// ใช้ Gemini 2.5 Flash Preview TTS — รองรับภาษาไทย + เลือกเสียงได้

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const { text, voiceName } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });

    // เสียงที่ Gemini รองรับ (เลือกเสียงครูได้) — default = Charon (เสียงผู้ชาย โทนนุ่ม)
    // เสียงอื่น เช่น: Kore, Puck, Aoede, Fenrir, Leda, Orus, Zephyr ฯลฯ
    const voice = voiceName || 'Charon';

    try {
        const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text }]
                    }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voice }
                            }
                        }
                    }
                })
            }
        );

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            return res.status(apiRes.status).json({ error: errText.slice(0, 300) });
        }

        const data = await apiRes.json();

        // ดึง audio (base64 PCM) จาก response
        const audioPart = data?.candidates?.[0]?.content?.parts?.find(
            p => p.inlineData && p.inlineData.data
        );

        if (!audioPart) {
            return res.status(502).json({ error: 'No audio returned from Gemini' });
        }

        const pcmBase64 = audioPart.inlineData.data;
        const mimeType  = audioPart.inlineData.mimeType || 'audio/L16;rate=24000';

        // Gemini คืน PCM ดิบ (L16, 24kHz) → ต้องห่อด้วย WAV header ให้ browser เล่นได้
        const sampleRate = parseInt((mimeType.match(/rate=(\d+)/) || [])[1] || '24000', 10);
        const pcmBuffer  = Buffer.from(pcmBase64, 'base64');
        const wavBuffer  = pcmToWav(pcmBuffer, sampleRate);

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'no-store');
        res.send(wavBuffer);

    } catch(e) {
        console.error('Gemini TTS error:', e);
        res.status(500).json({ error: e.message });
    }
}

// ── ห่อ PCM 16-bit mono → WAV ──
function pcmToWav(pcmData, sampleRate) {
    const numChannels   = 1;
    const bitsPerSample = 16;
    const byteRate      = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign    = numChannels * bitsPerSample / 8;
    const dataSize      = pcmData.length;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);            // fmt chunk size
    header.writeUInt16LE(1, 20);             // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
}