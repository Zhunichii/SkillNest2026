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