export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',  // เร็วและฟรี
                messages: [
                    {
                        role: 'system',
                        content: 'คุณเป็น AI ผู้ช่วยวิเคราะห์การเรียนรู้ ตอบเป็นภาษาไทยเสมอ กระชับ เป็นกันเอง และสร้างแรงบันดาลใจ'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
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