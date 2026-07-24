// /api/grade-answer.js
// ให้ AI ช่วยเสนอคะแนน + เหตุผล สำหรับคำตอบแบบอัตนัย (short_answer) — เป็นแค่ "ข้อเสนอแนะ"
// อาจารย์ยังต้องกดยืนยัน/แก้คะแนนเองก่อนบันทึกจริงเสมอ (ไม่ auto-save)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { question, answerText, sampleAnswer, maxPoints } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY_CHAT not set in environment variables' });
    }

    const points = Number(maxPoints) || 1;
    const prompt = `คุณเป็นผู้ช่วยอาจารย์ตรวจข้อสอบ/การบ้านแบบอัตนัย (เขียนตอบ) ในแพลตฟอร์มเรียนออนไลน์ SkillNest
โจทย์/คำถาม: ${question}
${sampleAnswer ? `เกณฑ์การให้คะแนน/คำตอบตัวอย่างที่อาจารย์กำหนดไว้:\n${sampleAnswer}` : '(อาจารย์ไม่ได้ระบุเกณฑ์การให้คะแนนไว้ ให้ประเมินจากความถูกต้อง ความครบถ้วน และความสมเหตุสมผลของคำตอบตามความรู้ทั่วไปในหัวข้อนี้)'}

คำตอบของนักเรียน: ${answerText && answerText.trim() ? answerText : '(นักเรียนไม่ได้ตอบ หรือส่งว่างเปล่า)'}

คะแนนเต็มข้อนี้คือ ${points} คะแนน (ให้คะแนนเป็นทศนิยม .5 ได้ เช่น 2.5)

กรุณาประเมินคำตอบอย่างเป็นธรรม แล้วเสนอคะแนนที่เหมาะสม พร้อมเหตุผลสั้นๆ 1-3 ประโยคที่อาจารย์จะใช้อ้างอิงประกอบการตัดสินใจ
ข้อควรระวัง: นี่เป็นเพียง "ข้อเสนอแนะ" อาจารย์เป็นผู้ตัดสินคะแนนสุดท้ายเองเสมอ ไม่ต้องสุภาพเกินจำเป็น ให้ตรงไปตรงมาและเป็นประโยชน์ต่อการตัดสินใจของอาจารย์

ตอบเป็น JSON เท่านั้น ไม่มีคำอธิบายเพิ่มเติม รูปแบบ:
{"suggestedScore": ตัวเลข 0-${points}, "reasoning": "เหตุผลสั้นๆ"}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err.error?.message || 'Gemini error' });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();

        let result;
        try {
            result = JSON.parse(clean);
        } catch (e) {
            return res.status(500).json({ error: 'AI ตอบกลับมาเป็น JSON ที่ไม่ถูกต้อง ลองใหม่อีกครั้ง' });
        }

        let score = Number(result.suggestedScore);
        if (isNaN(score)) score = 0;
        score = Math.max(0, Math.min(points, score));
        // ปัดเป็นทวีคูณของ 0.5 กันเลขทศนิยมแปลกๆ
        score = Math.round(score * 2) / 2;

        res.json({ suggestedScore: score, reasoning: result.reasoning || '' });

    } catch (err) {
        console.error('grade-answer error:', err);
        res.status(500).json({ error: err.message });
    }
}