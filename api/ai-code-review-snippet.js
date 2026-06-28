// ════════════════════════════════════════════════════════════
// AI Code Review — ตัวช่วยอาจารย์ตรวจโค้ดที่นักเรียนส่ง
// วิธีใช้: นำฟังก์ชันนี้ไปวางในหน้าที่อาจารย์ตรวจงาน (เช่น homework.html)
//          แล้วเรียก reviewStudentCode(code, language, question, maxScore)
// ════════════════════════════════════════════════════════════

window.reviewStudentCode = async function(code, language, questionTitle, maxScore = 100) {
    const systemPrompt = `คุณเป็นผู้ช่วยอาจารย์ในการตรวจโค้ดของนักเรียน
ให้ประเมินโค้ดอย่างยุติธรรมและสร้างสรรค์ ตอบเป็นภาษาไทยเสมอ
ให้ผลลัพธ์ในรูปแบบนี้:
1. ✅ จุดเด่นของโค้ด (สิ่งที่นักเรียนทำได้ดี)
2. ⚠️ จุดที่ควรปรับปรุง (บั๊ก, ประสิทธิภาพ, สไตล์การเขียน)
3. 💡 ข้อเสนอแนะเพื่อพัฒนา
4. 🎯 คะแนนที่แนะนำ (เต็ม ${maxScore}) พร้อมเหตุผลสั้นๆ
หมายเหตุ: คะแนนเป็นเพียงคำแนะนำ อาจารย์เป็นผู้ตัดสินใจสุดท้าย`;

    const prompt = `โจทย์: ${questionTitle}
ภาษา: ${language}

โค้ดที่นักเรียนส่ง:
\`\`\`${language}
${code}
\`\`\`

ช่วยตรวจและให้ feedback ตามรูปแบบที่กำหนด`;

    try {
        const res = await fetch('/api/groq-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, systemPrompt })
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.response || data.text || data.content || 'ไม่ได้รับผลตอบกลับ';
    } catch(e) {
        console.error('AI review error:', e);
        return '❌ เกิดข้อผิดพลาดในการเรียก AI: ' + e.message;
    }
};

// ── ตัวอย่าง UI ปุ่ม + แสดงผล (วางใน modal ตรวจงานของอาจารย์) ──
// <button onclick="handleAIReview('hwIdx', code, lang, title, maxScore)">🤖 ให้ AI ช่วยตรวจ</button>
// <div id="ai-review-result-hwIdx"></div>

window.handleAIReview = async function(slotId, code, language, questionTitle, maxScore) {
    const resultEl = document.getElementById('ai-review-result-' + slotId);
    if (!resultEl) return;
    resultEl.innerHTML = '<div style="color:#8B92AE;padding:12px;">🤖 AI กำลังตรวจโค้ด...</div>';
    const review = await window.reviewStudentCode(code, language, questionTitle, maxScore);
    resultEl.innerHTML = `
        <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);
            border-radius:10px;padding:16px;margin-top:10px;white-space:pre-wrap;
            font-size:0.88rem;line-height:1.7;color:#E2E8F0;">
            <div style="font-weight:600;margin-bottom:8px;color:#A5B4FC;">🤖 ผลการตรวจโดย AI (สำหรับอ้างอิง)</div>
            ${review.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
        </div>`;
};