// ════════════════════════════════════════════════════════════
// SkillNest — Email Confirmation Guard
// ใช้งาน: <script type="module" src="auth-guard.js"></script> วางไว้ในทุกหน้าที่ต้อง login ก่อนใช้งาน
// (ไม่ต้องใช้ในหน้า index.html / login.html / signup.html เพราะเป็นหน้าสาธารณะ/หน้ายืนยันตัวตนเอง)
//
// ทำไมต้องมีไฟล์นี้แยกต่างหาก:
// การเปิด "Confirm email" ใน Supabase กัน "การ login ครั้งแรก" ของบัญชีที่ยังไม่ยืนยันได้อยู่แล้ว
// (signInWithPassword จะ error "Email not confirmed" ทันที เข้าไม่ได้)
// แต่ "session ที่มีอยู่แล้วก่อนเปิดฟีเจอร์นี้" (สมัครไว้ตอนที่ยังไม่บังคับยืนยัน) จะยังใช้งานต่อได้ปกติ
// ไฟล์นี้จึงเป็นด่านที่ 2 เช็คซ้ำทุกหน้าที่โหลด ว่า session ปัจจุบันมาจากบัญชีที่ยืนยันอีเมลแล้วจริงหรือไม่
// ════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

(async function checkEmailConfirmed() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        // ไม่มี user เลย (ยังไม่ login) — ปล่อยให้ logic เดิมของแต่ละหน้าจัดการ redirect ไป login เอง ไม่ใช่หน้าที่ไฟล์นี้
        if (!user) return;

        // มี user แต่ยังไม่ยืนยันอีเมล — เตะออกจากระบบทันที กันไม่ให้ใช้งานต่อได้
        if (!user.email_confirmed_at) {
            await supabase.auth.signOut();
            window.location.href = 'login-page/login.html?reason=unconfirmed';
        }
    } catch (e) {
        // เช็คไม่สำเร็จ (เช่น เน็ตหลุดชั่วคราว) — ปล่อยผ่านไปก่อน ไม่บล็อกผู้ใช้ที่ยืนยันแล้วเพราะปัญหาเน็ตชั่วคราว
        console.warn('auth-guard: ตรวจสอบสถานะยืนยันอีเมลไม่สำเร็จ', e);
    }
})();