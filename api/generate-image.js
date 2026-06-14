// api/generate-image.js — proxy Pollinations image generation
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const key = process.env.POLLINATIONS_KEY || '';

    try {
        const encoded = encodeURIComponent(prompt);
        const url     = `https://gen.pollinations.ai/image/${encoded}?width=512&height=384&model=flux&nologo=true${key ? '&key=' + key : ''}`;

        const imgRes = await fetch(url, {
            headers: { 'User-Agent': 'SkillNest/1.0' }
        });

        if (!imgRes.ok) {
            const txt = await imgRes.text();
            return res.status(imgRes.status).json({ error: txt.slice(0, 200) });
        }

        const buf = await imgRes.arrayBuffer();
        res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(buf));

    } catch(e) {
        res.status(500).json({ error: e.message });
    }
}