// /api/generate-thumbnail.js
// สร้างรูปปกคอร์สด้วย Pollinations.ai (ฟรี ไม่ต้องใช้ API key, ใช้โมเดล Flux)
// เอกสาร: https://pollinations.ai — เรียกผ่าน GET URL ธรรมดา ไม่มีค่าใช้จ่าย ไม่ต้องสมัครสมาชิก

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'prompt required' });

    // เสริม prompt ให้เหมาะกับภาพปกคอร์ส (เขียนเป็นอังกฤษเพราะโมเดล Flux เข้าใจอังกฤษได้แม่นกว่า
    // แต่ยังคงคำอธิบายภาษาไทยของผู้ใช้ไว้ในนั้นด้วย โมเดลอ่านผสมได้ในระดับหนึ่ง)
    const fullPrompt =
        `course cover thumbnail illustration, ${prompt}, ` +
        `wide 16:9 banner composition, clean modern design, no text, no letters, no words, no watermark, no logo`;

    // สุ่ม seed ทุกครั้งเพื่อให้ "สร้างใหม่อีกครั้ง" ได้ภาพที่ต่างจากเดิม
    const seed = Math.floor(Math.random() * 1_000_000_000);

    const imageUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
        `?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Pollinations image API error (HTTP ${response.status}) — ลองใหม่อีกครั้ง`
            });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            // บางครั้งถ้า prompt ถูกกรอง อาจได้ error page กลับมาแทนรูปภาพ
            return res.status(500).json({ error: 'AI ไม่สามารถสร้างภาพได้ ลองเปลี่ยนคำอธิบายแล้วลองใหม่' });
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        res.json({
            image: base64,
            mimeType: contentType
        });

    } catch (err) {
        console.error('generate-thumbnail (pollinations) error:', err);
        res.status(500).json({ error: err.message });
    }
}