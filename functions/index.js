const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const groqKey = defineSecret("GROQ_API_KEY");

exports.generateQuiz = onRequest(
    { secrets: [groqKey], cors: true },
    async (req, res) => {
        const { prompt } = req.body;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${groqKey.value()}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            const rawText = data.choices?.[0]?.message?.content || '';
            const clean = rawText.replace(/```json|```/g, '').trim();

            res.json({ text: clean });

        } catch (err) {
            console.error('Groq error:', err);
            res.status(500).json({ error: err.message });
        }
    }
);