// ════════════════════════════════════════════════════════════
// SkillNest — Theme Switcher
// ใช้งาน: <script src="theme-switcher.js"></script> ก่อน </body>
// (ต้องมี theme.css โหลดอยู่ในหน้าด้วย)
// ════════════════════════════════════════════════════════════

(function () {
    const STORAGE_KEY = 'skillnest_theme';
    const THEMES = [
        { id: 'dark',          label: 'มืด (Dark)',              icon: '🌙' },
        { id: 'light',         label: 'สว่าง (Light)',           icon: '☀️' },
        { id: 'deuteranopia',  label: 'ตาบอดสีแดง-เขียว',        icon: '🔵' },
        { id: 'protanopia',    label: 'ตาบอดสีแดงเข้ม',          icon: '🟢' },
    ];

    function getSavedTheme() {
        try { return localStorage.getItem(STORAGE_KEY) || 'dark'; }
        catch (e) { return 'dark'; }
    }

    function applyTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        try { localStorage.setItem(STORAGE_KEY, themeId); } catch (e) {}
        document.querySelectorAll('.theme-opt').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === themeId);
        });
        const trigger = document.getElementById('themeSwitcherTrigger');
        if (trigger) {
            const t = THEMES.find(t => t.id === themeId);
            trigger.textContent = t ? t.icon : '🎨';
        }
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #themeSwitcherWrap {
                position: fixed; bottom: 24px; right: 24px; z-index: 9999;
                font-family: var(--font-body, 'Inter', sans-serif);
            }
            #themeSwitcherTrigger {
                width: 48px; height: 48px; border-radius: 50%;
                background: var(--primary, #6366F1); color: white;
                border: none; cursor: pointer; font-size: 1.3rem;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            }
            #themeSwitcherTrigger:hover { transform: scale(1.08); }
            #themeSwitcherPanel {
                position: absolute; bottom: 58px; right: 0;
                background: var(--bg-elevated, #11152E);
                border: 1px solid var(--border, rgba(226,232,240,0.12));
                border-radius: 14px; padding: 10px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.4);
                min-width: 220px; display: none;
            }
            #themeSwitcherPanel.open { display: block; }
            #themeSwitcherPanel .panel-title {
                font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
                color: var(--text-faint, #545B78); padding: 4px 10px 8px;
                font-family: var(--font-mono, monospace);
            }
            .theme-opt {
                display: flex; align-items: center; gap: 10px;
                padding: 9px 10px; border-radius: 9px; cursor: pointer;
                color: var(--text-dim, #8B92AE); font-size: 0.86rem;
                transition: background 0.15s, color 0.15s;
            }
            .theme-opt:hover { background: var(--card-hover, rgba(226,232,240,0.07)); color: var(--text, #E2E8F0); }
            .theme-opt.active {
                background: var(--active-lesson, rgba(99,102,241,0.16));
                color: var(--text, #E2E8F0); font-weight: 500;
            }
            .theme-opt .opt-icon { font-size: 1.05rem; width: 22px; text-align: center; }
            @media (max-width: 640px) {
                #themeSwitcherWrap { bottom: 16px; right: 16px; }
            }
        `;
        document.head.appendChild(style);
    }

    function injectMarkup() {
        const wrap = document.createElement('div');
        wrap.id = 'themeSwitcherWrap';
        wrap.innerHTML = `
            <button id="themeSwitcherTrigger" aria-label="เปลี่ยนธีม" title="เปลี่ยนธีม">🌙</button>
            <div id="themeSwitcherPanel" role="menu">
                <div class="panel-title">เลือกธีม</div>
                ${THEMES.map(t => `
                    <div class="theme-opt" data-theme="${t.id}" role="menuitem" tabindex="0">
                        <span class="opt-icon">${t.icon}</span>
                        <span>${t.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
        document.body.appendChild(wrap);

        const trigger = document.getElementById('themeSwitcherTrigger');
        const panel = document.getElementById('themeSwitcherPanel');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });

        document.addEventListener('click', () => panel.classList.remove('open'));
        panel.addEventListener('click', (e) => e.stopPropagation());

        panel.querySelectorAll('.theme-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                applyTheme(opt.dataset.theme);
                panel.classList.remove('open');
            });
            opt.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    applyTheme(opt.dataset.theme);
                    panel.classList.remove('open');
                }
            });
        });
    }

    function init() {
        // ใช้ค่าที่บันทึกไว้ทันที (ก่อน DOM พร้อมด้วยซ้ำ เพื่อกัน flash of wrong theme)
        const saved = getSavedTheme();
        document.documentElement.setAttribute('data-theme', saved);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        injectStyles();
        injectMarkup();
        applyTheme(getSavedTheme());
    }

    init();
})();