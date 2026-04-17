export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, courseTitle, lessonTitle, pdfText } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    // สร้าง system prompt
    const contextSection = pdfText
        ? `\n\n=== เนื้อหาในไฟล์ PDF ของบทเรียนนี้ ===\n${pdfText.substring(0, 8000)}\n=== สิ้นสุดเนื้อหา ===`
        : '';

    const systemPrompt = `คุณเป็น AI ผู้ช่วยสอนสำหรับคอร์ส "${courseTitle || 'นี้'}"
บทเรียนปัจจุบัน: "${lessonTitle || 'ไม่ระบุ'}"${contextSection}

กฎการตอบ:
- ถ้ามีเนื้อหา PDF ให้อิงจากเนื้อหานั้นเป็นหลัก
- ถ้าคำถามอยู่นอกเหนือเนื้อหา PDF ให้บอกว่า "คำถามนี้ไม่อยู่ในเนื้อหาบทเรียน แต่..." แล้วตอบตามความรู้ทั่วไป
- ตอบเป็นภาษาไทย กระชับ และเข้าใจง่าย`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [
                        { role: 'user', parts: [{ text: prompt }] }
                    ],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!response.ok) {
            const errData = await response.json();
            console.error('Gemini API error:', errData);
            return res.status(response.status).json({ error: errData?.error?.message || 'Gemini error' });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถตอบได้';
        return res.status(200).json({ text });

    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: err.message });
    }
}