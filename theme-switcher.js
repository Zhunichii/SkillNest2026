// ════════════════════════════════════════════════════════════
// SkillNest — Theme Applier
// ใช้งาน: <script src="theme-switcher.js"></script> ก่อน </body>
// UI เลือกธีมอยู่ใน setting.html → แท็บ "ธีม & การแสดงผล"
// ════════════════════════════════════════════════════════════

(function () {
    const STORAGE_KEY = 'skillnest_theme';

    function getSavedTheme() {
        try { return localStorage.getItem(STORAGE_KEY) || 'dark'; }
        catch (e) { return 'dark'; }
    }

    // Apply ทันที ก่อน DOM ready — กัน flash of wrong theme
    document.documentElement.setAttribute('data-theme', getSavedTheme());
})();