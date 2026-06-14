// api/elevenlabs-voices.js — ดึง voice list จาก ElevenLabs
export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });

    try {
        const elRes = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': apiKey }
        });
        const data = await elRes.json();

        // ส่งแค่ข้อมูลที่จำเป็น
        const voices = (data.voices || []).map(v => ({
            voice_id: v.voice_id,
            name:     v.name,
            labels:   v.labels || {},
            preview_url: v.preview_url,
        }));

        res.setHeader('Cache-Control', 'max-age=3600');
        res.status(200).json({ voices });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
}