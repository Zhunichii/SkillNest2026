// /api/ai.js
// รวม 3 endpoint เดิม (generate-quiz, generate-thumbnail, grade-answer) เป็นไฟล์เดียว
// เหตุผล: Vercel Hobby plan จำกัด Serverless Functions ไว้ที่ 12 ไฟล์ต่อ deployment
// เลือกฟังก์ชันที่จะเรียกด้วย query param ?fn=quiz | ?fn=thumbnail | ?fn=grade
// (ไม่ใส่ ?fn= เลย จะ default ไปที่ quiz/outline generator เพื่อเข้ากันได้กับโค้ดเดิม)

export default async function handler(req, res) {
    const fn = req.query.fn;

    if (fn === 'thumbnail') return handleThumbnail(req, res);
    if (fn === 'grade')     return handleGrade(req, res);
    return handleQuiz(req, res);
}

// ============================================================
// 1) QUIZ / COURSE OUTLINE GENERATOR (เดิม /api/generate-quiz.js)
// รองรับทั้ง Quiz generation และ Course Outline generation
// ============================================================
async function handleQuiz(req, res) {
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

// ============================================================
// 2) THUMBNAIL GENERATOR (เดิม /api/generate-thumbnail.js)
// สร้างรูปปกคอร์สด้วย Pollinations.ai (ฟรี ไม่ต้องใช้ API key, ใช้โมเดล Flux)
// ============================================================
async function handleThumbnail(req, res) {
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

// ============================================================
// 3) AI GRADING ASSISTANT (เดิม /api/grade-answer.js)
// ให้ AI ช่วยเสนอคะแนน + เหตุผล สำหรับคำตอบแบบอัตนัย (short_answer) — เป็นแค่ "ข้อเสนอแนะ"
// อาจารย์ยังต้องกดยืนยัน/แก้คะแนนเองก่อนบันทึกจริงเสมอ (ไม่ auto-save)
// ============================================================
async function handleGrade(req, res) {
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