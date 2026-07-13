// /api/generate-quiz.js
// รองรับทั้ง Quiz generation และ Course Outline generation

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { topic, count, type: reqType, prompt: customPrompt, image, mimeType, images } = req.body;

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

    // รองรับ Gemini Vision: แนบได้ทั้งภาพเดียว (image) หรือหลายภาพ (images[]) เช่น หน้า PDF ที่ render เป็นรูป
    const parts = [{ text: prompt }];
    if (Array.isArray(images) && images.length > 0) {
        images.forEach(img => {
            if (img && img.data) {
                parts.push({
                    inlineData: {
                        mimeType: img.mimeType || 'image/jpeg',
                        data: img.data
                    }
                });
            }
        });
    } else if (image) {
        parts.push({
            inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: image
            }
        });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: reqType === 'outline' ? 16384 : 1500
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Gemini error' });
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';
        const finishReason = candidate?.finishReason || '';

        // ถ้าเป็น outline mode ส่ง text กลับตรงๆ ให้ client parse
        if (reqType === 'outline' || customPrompt) {
            const cleaned = text.replace(/```json|```/g, '').trim();
            let repairedText = cleaned;
            let parsedOk = true;
            try {
                JSON.parse(cleaned);
            } catch (e) {
                parsedOk = false;
                repairedText = repairTruncatedJsonArray(cleaned);
            }

            // ตรวจซ้ำอีกครั้งว่า repair แล้ว parse ผ่านจริงไหม ถ้าไม่ผ่านให้แจ้ง error แทนที่จะส่ง JSON เสียกลับไป
            try {
                const repairedArr = JSON.parse(repairedText);
                if (!parsedOk && finishReason === 'MAX_TOKENS') {
                    // เนื้อหายาวเกินจนถูกตัด — เก็บเท่าที่ parse ได้ แต่แจ้งเตือนไว้ใน response ด้วย
                    return res.json({
                        text: repairedText,
                        warning: `เนื้อหายาวเกินไป AI สร้างได้ไม่ครบ (เก็บได้ ${Array.isArray(repairedArr) ? repairedArr.length : 0} ข้อ) ลองแบ่งไฟล์ให้เล็กลงหรือทำทีละส่วน`
                    });
                }
                return res.json({ text: repairedText });
            } catch (e2) {
                return res.status(500).json({
                    error: finishReason === 'MAX_TOKENS'
                        ? 'เนื้อหายาวเกินไป AI สร้างคำตอบไม่เสร็จและกู้คืนไม่ได้ ลองแบ่งไฟล์ให้เล็กลงหรือลดจำนวนหน้าแล้วลองใหม่'
                        : 'AI ตอบกลับมาเป็น JSON ที่ไม่ถูกต้อง ลองใหม่อีกครั้ง'
                });
            }
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

// กู้ JSON array ที่ถูกตัดกลางคัน (เช่น token limit หมดกลาง string) โดยตัดทิ้งเฉพาะ
// object สุดท้ายที่ยังไม่สมบูรณ์ แทนที่จะพยายามปะต่อ string ที่ขาดหาย (ซึ่งมักทำให้ได้ JSON ที่ยัง invalid อยู่ดี)
function repairTruncatedJsonArray(rawText) {
    const startIdx = rawText.indexOf('[');
    if (startIdx === -1) return rawText; // ไม่ใช่ array ซ่อมด้วยวิธีนี้ไม่ได้

    let depth = 0;
    let inString = false;
    let escape = false;
    let lastCompleteEnd = -1;

    for (let i = startIdx; i < rawText.length; i++) {
        const ch = rawText[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) lastCompleteEnd = i; // ปิด object ระดับบนสุดสมบูรณ์ 1 ตัว
        }
    }

    if (lastCompleteEnd === -1) return rawText; // ไม่มี object ไหนสมบูรณ์เลย กู้ไม่ได้
    return rawText.slice(startIdx, lastCompleteEnd + 1) + ']';
}