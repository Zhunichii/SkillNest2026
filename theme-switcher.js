// ════════════════════════════════════════════════════════════
// SkillNest — Theme Applier
// ใช้งาน: <script src="theme-switcher.js"></script> ก่อน </body>
// UI เลือกธีมอยู่ใน setting.html → แท็บ "ธีม & การแสดงผล"
// ════════════════════════════════════════════════════════════

(function () {
    const STORAGE_KEY = 'skillnest_theme';
    const VALID_THEMES = ['dark', 'light']; // ตัดโหมดตาบอดสีออกแล้ว เหลือแค่ 2 ธีมนี้

    function getSavedTheme() {
        let saved;
        try { saved = localStorage.getItem(STORAGE_KEY); }
        catch (e) { saved = null; }

        // เผื่อกรณีผู้ใช้เก่าเคยเลือกธีมที่ตอนนี้ถอดออกไปแล้ว (เช่น deuteranopia/protanopia)
        // ให้ fallback กลับไปเป็น 'dark' อัตโนมัติ แทนที่จะค้างอยู่ที่ธีมที่เลือกใหม่ไม่ได้แล้ว
        if (!saved || !VALID_THEMES.includes(saved)) {
            saved = 'dark';
            try { localStorage.setItem(STORAGE_KEY, saved); } catch (e) {}
        }
        return saved;
    }

    // Apply ทันที ก่อน DOM ready — กัน flash of wrong theme
    document.documentElement.setAttribute('data-theme', getSavedTheme());
})();

// ════════════════════════════════════════════════════════════
// Page-transition progress bar — เว็บนี้เป็น multi-page (โหลดหน้าใหม่ทุกครั้ง)
// แถบนี้ให้ feedback ทันทีว่าคลิกลิงก์ติดแล้ว ระหว่างรอหน้าใหม่โหลด
// ════════════════════════════════════════════════════════════
(function () {
    function start() {
        const bar = document.createElement('div');
        bar.className = 'sn-page-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        // จำลองความคืบหน้าของหน้าปัจจุบันที่กำลังโหลดอยู่ตอนนี้
        requestAnimationFrame(() => { bar.style.width = '65%'; });
        window.addEventListener('load', () => {
            bar.style.width = '100%';
            setTimeout(() => bar.classList.add('sn-page-progress-done'), 120);
        });

        // คลิกลิงก์ไปหน้าอื่นในเว็บเดียวกัน → วิ่งแถบทันทีก่อนหน้าใหม่จะเริ่มโหลด
        document.addEventListener('click', function (e) {
            const a = e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 ||
                href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
            if (a.target === '_blank' || a.hasAttribute('download') || e.defaultPrevented ||
                e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            bar.classList.remove('sn-page-progress-done');
            bar.style.width = '88%';
        }, true);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();

// ════════════════════════════════════════════════════════════
// Scroll-reveal — element ที่มี class "sn-reveal" จะค่อยๆ ขึ้นเมื่อเลื่อนมาถึง
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    const items = document.querySelectorAll('.sn-reveal');
    if (!items.length || !('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('sn-reveal-ready');
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('sn-in'); io.unobserve(en.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
});