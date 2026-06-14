// api/elevenlabs-clone.js
// รับ audio file → ใช้เป็น speaker reference สำหรับ XTTS-v2
// เก็บ base64 ของเสียงไว้ใน Supabase แทน voice_id

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfKey) return res.status(500).json({ error: 'HUGGINGFACE_API_KEY not configured' });

    try {
        // รับ multipart form data
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const rawBody     = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        // แยก boundary จาก content-type
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) return res.status(400).json({ error: 'Invalid multipart form' });

        const boundary = boundaryMatch[1];
        const parts    = rawBody.toString('binary').split('--' + boundary);

        let audioBuffer = null;
        let audioMime   = 'audio/webm';

        for (const part of parts) {
            if (part.includes('Content-Disposition') && part.includes('filename')) {
                const mimeMatch = part.match(/Content-Type: (.+)\r\n/);
                if (mimeMatch) audioMime = mimeMatch[1].trim();
                const dataStart = part.indexOf('\r\n\r\n') + 4;
                const dataEnd   = part.lastIndexOf('\r\n');
                if (dataStart > 4 && dataEnd > dataStart) {
                    audioBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
                }
                break;
            }
        }

        if (!audioBuffer) return res.status(400).json({ error: 'No audio file found' });

        // ทดสอบว่า HF API ใช้ได้โดย ping model
        const testRes = await fetch(
            'https://api-inference.huggingface.co/models/coqui/XTTS-v2',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: 'test' }),
            }
        );

        // เก็บ audio เป็น base64 ส่งกลับ (จะเก็บใน Supabase โดย client)
        const audioBase64 = audioBuffer.toString('base64');
        const voice_id    = `hf_xtts_${Date.now()}`; // pseudo voice_id

        return res.status(200).json({
            voice_id,
            audio_base64: audioBase64,
            audio_mime:   audioMime,
            provider:     'huggingface_xtts',
        });

    } catch(e) {
        return res.status(500).json({ error: e.message });
    }
}