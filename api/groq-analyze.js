export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt, systemPrompt, messages } = req.body;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    try {
        // สร้าง messages array สำหรับ Groq
        const groqMessages = [];

        // system prompt (รองรับทั้ง PDF context และ general)
        const sysContent = systemPrompt ||
            'คุณเป็น AI ผู้ช่วยวิเคราะห์การเรียนรู้สำหรับแพลตฟอร์ม SkillNest ตอบเป็นภาษาไทยเสมอ';
        groqMessages.push({ role: 'system', content: sysContent });

        // chat history (multi-turn) — จำกัดแค่ 10 รอบล่าสุด
        if (Array.isArray(messages) && messages.length > 0) {
            const recent = messages.slice(-20); // max 20 messages (10 turns)
            recent.forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    groqMessages.push({ role: m.role, content: String(m.content) });
                }
            });
        }

        // คำถาม/prompt ปัจจุบัน (ถ้ายังไม่อยู่ใน messages)
        const lastMsg = groqMessages[groqMessages.length - 1];
        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== prompt) {
            groqMessages.push({ role: 'user', content: prompt });
        }

        const callGroq = (extra) => fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                // llama-3.3-70b-versatile ถูก Groq เลิกใช้แล้ว (16 ส.ค. 2026) → ใช้ openai/gpt-oss-120b
                model: 'openai/gpt-oss-120b',
                messages: groqMessages,
                temperature: 0.7,
                // max_tokens ถูกประกาศ deprecated ใน API → ใช้ max_completion_tokens
                max_completion_tokens: 1500,
                ...extra
            })
        });

        // gpt-oss เป็น reasoning model: ตั้ง effort ต่ำ + ซ่อน reasoning เพื่อให้เหลือ token ไว้ตอบจริง
        let response = await callGroq({ reasoning_effort: 'low', include_reasoning: false });
        if (response.status === 400) {
            // เผื่อพารามิเตอร์ reasoning ถูกปฏิเสธ → ลองใหม่แบบไม่ส่งพารามิเตอร์พิเศษ
            const first = await response.json().catch(() => ({}));
            console.warn('groq-analyze: 400 ลองใหม่แบบไม่ใส่ reasoning params', first.error?.message);
            response = await callGroq({});
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('groq-analyze: Groq error', response.status, err);
            return res.status(response.status).json({ error: `Groq ${response.status}: ${err.error?.message || 'API error'}` });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (!text) {
            // เก็บ log ไว้ช่วย debug — ถ้า Groq คืนคำตอบว่างเปล่ามาแม้ request จะสำเร็จ (HTTP 200)
            // เช่น token budget ไม่พอ (finish_reason: "length") จะได้เห็นสาเหตุจาก Vercel logs โดยไม่ต้องพึ่ง DevTools ฝั่ง client
            console.warn('groq-analyze: ได้คำตอบว่างเปล่าจาก Groq', {
                finishReason: data.choices?.[0]?.finish_reason,
                usage: data.usage,
            });
        }
        res.json({ text });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}