// /api/generate-thumbnail.js
// สร้างรูปปกคอร์สด้วย Gemini image generation (Nano Banana)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'prompt required' });

    // ใช้ key เดียวกับฝั่งสร้างคอร์ส (GEMINI_API_KEY_COURSE)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY_COURSE || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY_COURSE not set in environment variables' });
    }

    const fullPrompt = `สร้างภาพปกคอร์สเรียนออนไลน์ (thumbnail) สำหรับเนื้อหา: ${prompt}
โจทย์ภาพ: อัตราส่วนภาพแนวนอนประมาณ 16:9 ดูทันสมัย สวยงาม เหมาะเป็นภาพปกหน้าคอร์สเรียน
ข้อห้าม: ห้ามมีตัวอักษร ตัวเลข หรือข้อความใดๆ ปรากฏอยู่ในภาพเด็ดขาด`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE']
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err.error?.message || 'Gemini image API error' });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData && p.inlineData.data);

        if (!imagePart) {
            // โมเดลอาจปฏิเสธ (เช่น เนื้อหาไม่เหมาะสม) หรือตอบกลับเป็นข้อความแทน
            const textPart = parts.find(p => p.text)?.text || '';
            return res.status(500).json({
                error: textPart
                    ? `AI ไม่สามารถสร้างภาพได้: ${textPart}`
                    : 'AI ไม่สามารถสร้างภาพได้ ลองเปลี่ยนคำอธิบายแล้วลองใหม่'
            });
        }

        res.json({
            image: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || 'image/png'
        });

    } catch (err) {
        console.error('generate-thumbnail error:', err);
        res.status(500).json({ error: err.message });
    }
}