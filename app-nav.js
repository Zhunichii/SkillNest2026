// ════════════════════════════════════════════════════════════
// SkillNest — Shared top navigation (แถบบนเหมือนกันทุกหน้าในระบบ)
// ใช้: <script type="module" src="app-nav.js"></script> ใส่ในทุกหน้าที่ล็อกอินแล้ว ยกเว้น dashboard.html (มีแถบของตัวเองที่เป็นต้นแบบ)
// ผล: โลโก้ (ซ้าย) · ปุ่ม "← กลับหน้าหลัก" · ปุ่มโปรไฟล์ (รูป + ชื่อ + เมนู) (ขวา)
// ถ้าหน้านั้นมี <nav class="top-nav"> เดิมอยู่ จะถูกแทนที่ ถ้าไม่มีจะเพิ่มให้และดันเนื้อหาลง 70px
// ════════════════════════════════════════════════════════════
import { supabase } from './supabase.js';

(function () {
    if (document.getElementById('snAppNav')) return;

    const css = `
    .sn-appnav{position:fixed;top:0;left:0;right:0;height:70px;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 30px;background:var(--nav-bg);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);border-bottom:1px solid var(--border-color);font-family:var(--font-body,inherit)}
    .sn-appnav *{box-sizing:border-box}
    .sn-appnav .sn-logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.2rem;color:var(--text-main);text-decoration:none}
    .sn-appnav .sn-logo-icon{background:var(--primary-blue);color:#fff;padding:4px 8px;border-radius:var(--radius-sm,8px);font-size:.9rem}
    .sn-appnav .sn-right{display:flex;align-items:center;gap:12px}
    .sn-appnav .sn-back{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--radius-sm,8px);background:var(--card-bg);border:1px solid var(--border-color);color:var(--text-dim);font-size:.9rem;text-decoration:none;white-space:nowrap;transition:.2s}
    .sn-appnav .sn-back:hover{color:var(--text-main);border-color:var(--primary-blue);background:rgba(99,102,241,.1)}
    .sn-appnav .sn-pd{position:relative}
    .sn-appnav .sn-pbtn{display:flex;align-items:center;gap:8px;padding:8px 16px;border:0;border-radius:var(--radius-sm,8px);background:var(--primary-blue);color:#fff;font-weight:600;font-size:.9rem;font-family:inherit;cursor:pointer}
    .sn-appnav .sn-pic{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
    .sn-appnav .sn-pic img{width:100%;height:100%;object-fit:cover}
    .sn-appnav .sn-pic svg{width:16px;height:16px;fill:#fff}
    .sn-appnav .sn-menu{display:none;position:absolute;right:0;top:calc(100% + 8px);min-width:190px;padding:6px;border-radius:12px;background:var(--bg-color,#0f1020);border:1px solid var(--border-color);box-shadow:0 12px 32px rgba(0,0,0,.35)}
    .sn-appnav .sn-menu.show{display:block}
    .sn-appnav .sn-menu a{display:block;padding:10px 12px;border-radius:8px;color:var(--text-main);font-size:.9rem;text-decoration:none;cursor:pointer}
    .sn-appnav .sn-menu a:hover{background:var(--card-hover,rgba(255,255,255,.07))}
    body.sn-has-appnav-pad{padding-top:70px}
    @media(max-width:768px){.sn-appnav{padding:0 14px}.sn-appnav .sn-name{display:none}.sn-appnav .sn-pbtn{padding:8px}.sn-appnav .sn-back{padding:8px 12px;font-size:.82rem}}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    const nav = document.createElement('nav');
    nav.className = 'sn-appnav'; nav.id = 'snAppNav';
    nav.innerHTML = `
        <a href="dashboard.html" class="sn-logo"><span class="sn-logo-icon">S</span><span>SkillNest</span></a>
        <div class="sn-right">
            <a href="dashboard.html" class="sn-back">← กลับหน้าหลัก</a>
            <div class="sn-pd">
                <button class="sn-pbtn" id="snProfileBtn" type="button" aria-haspopup="true">
                    <span class="sn-pic" id="snPic"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>
                    <span class="sn-name" id="snName">...</span>
                </button>
                <div class="sn-menu" id="snMenu">
                    <a href="setting.html">ตั้งค่าบัญชี</a>
                    <a href="manage-courses.html" id="snManage" style="display:none">จัดการคอร์สของฉัน</a>
                    <a id="snLogout">ออกจากระบบ</a>
                </div>
            </div>
        </div>`;

    const old = document.querySelector('nav.top-nav');
    if (old) {
        const pos = getComputedStyle(old).position;
        old.replaceWith(nav);
        if (pos !== 'fixed' && pos !== 'sticky') document.body.classList.add('sn-has-appnav-pad');
    } else { document.body.insertBefore(nav, document.body.firstChild); document.body.classList.add('sn-has-appnav-pad'); }

    const menu = nav.querySelector('#snMenu');
    nav.querySelector('#snProfileBtn').addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('show'); });
    document.addEventListener('click', () => menu.classList.remove('show'));
    nav.querySelector('#snLogout').addEventListener('click', async () => {
        try { await supabase.auth.signOut(); } catch (e) {}
        window.location.href = 'login-page/login.html';
    });

    (async function loadUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: u } = await supabase.from('users').select('first_name,user_type,profile_picture').eq('id', user.id).single();
            if (!u) return;
            nav.querySelector('#snName').textContent = u.first_name || 'User';
            if (u.user_type === 'teacher') nav.querySelector('#snManage').style.display = 'block';
            if (u.profile_picture) {
                const img = new Image();
                img.alt = 'Profile';
                img.onload = () => { const pic = nav.querySelector('#snPic'); pic.innerHTML = ''; pic.appendChild(img); };
                img.src = u.profile_picture;
            }
        } catch (e) { console.warn('app-nav: โหลดโปรไฟล์ไม่สำเร็จ', e); }
    })();
})();