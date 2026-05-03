// /api/generate-quiz.js
// รองรับทั้ง Quiz generation และ Course Outline generation

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { topic, count, type: reqType, prompt: customPrompt } = req.body;

    // ใช้ key แยกกันตาม use case
    // GEMINI_API_KEY_COURSE → สำหรับสร้างคอร์ส/outline
    // GEMINI_API_KEY_CHAT   → สำหรับ Quiz generation
    const isOutline = reqType === 'outline' || !!customPrompt;
    const GEMINI_API_KEY = isOutline
        ? (process.env.GEMINI_API_KEY_COURSE || process.env.GEMINI_API_KEY)
        : (process.env.GEMINI_API_KEY_CHAT   || process.env.GEMINI_API_KEY);

    if (!GEMINI_API_KEY) {
        const missing = isOutline ? 'GEMINI_API_KEY_COURSE' : 'GEMINI_API_KEY_CHAT';
        return res.status(500).json({ error: `${missing} not set in environment variables` });
    }

    // ถ้ามี customPrompt (จาก AI Outline) ใช้เลย ไม่ต้องสร้างเอง
    let prompt = customPrompt;

    // ถ้าไม่มี customPrompt ให้สร้าง Quiz prompt เหมือนเดิม
    if (!prompt) {
        const numQ = parseInt(count) || 5;
        prompt = `สร้างแบบทดสอบปรนัย ${numQ} ข้อ เกี่ยวกับ "${topic}"
ตอบเป็น JSON array เท่านั้น ไม่มีคำอธิบาย รูปแบบ:
[{"question":"คำถาม","options":["ก.","ข.","ค.","ง."],"correct":0,"explanation":"คำอธิบาย"}]`;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: reqType === 'outline' ? 4096 : 1500
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Gemini error' });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // ถ้าเป็น outline mode ส่ง text กลับตรงๆ ให้ client parse
        if (reqType === 'outline' || customPrompt) {
            // พยายาม repair JSON ที่ถูกตัดกลางคัน
            let repairedText = text;
            try {
                JSON.parse(text.replace(/```json|```/g, '').trim());
            } catch(e) {
                // ถ้า parse ไม่ได้ ให้ลอง close JSON อัตโนมัติ
                let t = text.replace(/```json|```/g, '').trim();
                // นับ bracket ที่เปิดแต่ยังไม่ปิด
                let opens = (t.match(/\[/g)||[]).length - (t.match(/\]/g)||[]).length;
                let opensBrace = (t.match(/\{/g)||[]).length - (t.match(/\}/g)||[]).length;
                // ตัด trailing comma ออก
                t = t.replace(/,\s*$/, '');
                t = t.replace(/,\s*([\]}])/g, '$1');
                for (let i = 0; i < opensBrace; i++) t += '}';
                for (let i = 0; i < opens; i++) t += ']';
                repairedText = t;
            }
            return res.json({ text: repairedText });
        }

        // Quiz mode — parse JSON array
        const clean = text.replace(/```json|```/g, '').trim();
        const quiz = JSON.parse(clean);
        res.json({ quiz });

    } catch(err) {
        console.error('generate-quiz error:', err);
        res.status(500).json({ error: err.message });
    }
}