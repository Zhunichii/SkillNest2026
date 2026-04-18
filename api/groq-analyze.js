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

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: groqMessages,
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.error?.message || 'Groq API error' });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        res.json({ text });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}