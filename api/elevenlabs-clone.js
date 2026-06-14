// api/elevenlabs-clone.js
// รับ multipart/form-data (audio file) → ส่งไป ElevenLabs → return voice_id

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });

    try {
        // อ่าน raw body แล้วส่งต่อ multipart ไป ElevenLabs โดยตรง
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const rawBody    = Buffer.concat(chunks);
        const contentType = req.headers['content-type'];

        const elRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': contentType,
            },
            body: rawBody,
        });

        const data = await elRes.json();
        if (!elRes.ok) return res.status(elRes.status).json({ error: data.detail?.message || JSON.stringify(data) });

        return res.status(200).json({ voice_id: data.voice_id });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}