// ════════════════════════════════════════════════════════════
// SkillNest — Theme Switcher v2
// ใช้งาน: <script src="theme-switcher.js"></script> ก่อน </body>
// (ต้องมี theme.css โหลดอยู่ในหน้าด้วย)
//
// Auto-detect mount point (ตามลำดับ priority):
//   1. .nav-right   → append เข้า nav-right (dashboard / learning / analytics)
//   2. .top-nav / .navbar  → append เข้า nav โดยตรง (course-content / setting ฯลฯ)
//   3. ไม่มี nav    → floating button มุมขวาล่าง (login / signup ฯลฯ)
// ════════════════════════════════════════════════════════════

(function () {
    const STORAGE_KEY = 'skillnest_theme';
    const THEMES = [
        { id: 'dark',         label: 'มืด (Dark)',        icon: '🌙' },
        { id: 'light',        label: 'สว่าง (Light)',     icon: '☀️' },
        { id: 'deuteranopia', label: 'ตาบอดสีแดง-เขียว', icon: '🔵' },
        { id: 'protanopia',   label: 'ตาบอดสีแดงเข้ม',  icon: '🟢' },
    ];

    // ─── Theme persistence ───────────────────────────────────
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

    // ─── Detect where to mount ───────────────────────────────
    function getMountTarget() {
        // Priority 1: .nav-right (dashboard, learning, teacher-analytics)
        const navRight = document.querySelector('.nav-right');
        if (navRight) return { el: navRight, mode: 'nav' };

        // Priority 2: .top-nav or .navbar (หน้าที่มี nav แต่ไม่มี nav-right)
        const nav = document.querySelector('.top-nav, nav.navbar');
        if (nav) return { el: nav, mode: 'nav' };

        // Priority 3: float (ไม่มี nav เลย)
        return { el: document.body, mode: 'float' };
    }

    // ─── Styles ──────────────────────────────────────────────
    function injectStyles(mode) {
        const style = document.createElement('style');

        const sharedPanel = `
            #themeSwitcherPanel {
                position: absolute;
                background: var(--bg-elevated, #11152E);
                border: 1px solid var(--border, rgba(226,232,240,0.12));
                border-radius: 14px; padding: 10px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.4);
                min-width: 220px; display: none; z-index: 10001;
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
                user-select: none;
            }
            .theme-opt:hover {
                background: var(--card-hover, rgba(226,232,240,0.07));
                color: var(--text, #E2E8F0);
            }
            .theme-opt.active {
                background: var(--active-lesson, rgba(99,102,241,0.16));
                color: var(--text, #E2E8F0); font-weight: 500;
            }
            .theme-opt .opt-icon { font-size: 1.05rem; width: 22px; text-align: center; }
        `;

        if (mode === 'nav') {
            style.textContent = sharedPanel + `
                #themeSwitcherWrap {
                    position: relative;
                    display: inline-flex; align-items: center;
                    font-family: var(--font-body, 'Inter', sans-serif);
                    flex-shrink: 0;
                    margin-left: 4px;
                }
                #themeSwitcherTrigger {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: var(--card-hover, rgba(226,232,240,0.07));
                    border: 1px solid var(--border, rgba(226,232,240,0.12));
                    color: var(--text-main, #E2E8F0);
                    cursor: pointer; font-size: 1.05rem;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s, transform 0.15s;
                }
                #themeSwitcherTrigger:hover {
                    background: var(--card-bg, rgba(226,232,240,0.04));
                    transform: scale(1.1);
                }
                /* dropdown เปิดลงล่าง */
                #themeSwitcherPanel {
                    top: calc(100% + 8px);
                    right: 0;
                }
                @media (max-width: 640px) {
                    #themeSwitcherWrap { margin-left: 2px; }
                    #themeSwitcherTrigger { width: 32px; height: 32px; font-size: 0.95rem; }
                }
            `;
        } else {
            style.textContent = sharedPanel + `
                #themeSwitcherWrap {
                    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
                    font-family: var(--font-body, 'Inter', sans-serif);
                }
                #themeSwitcherTrigger {
                    width: 42px; height: 42px; border-radius: 50%;
                    background: var(--primary, #6366F1); color: white;
                    border: none; cursor: pointer; font-size: 1.2rem;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                    transition: transform 0.2s;
                }
                #themeSwitcherTrigger:hover { transform: scale(1.08); }
                /* dropdown เปิดขึ้นบน */
                #themeSwitcherPanel {
                    bottom: 52px;
                    right: 0;
                }
                @media (max-width: 640px) {
                    #themeSwitcherWrap { bottom: 16px; right: 16px; }
                }
            `;
        }

        document.head.appendChild(style);
    }

    // ─── Markup + Events ─────────────────────────────────────
    function injectMarkup(mountEl) {
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
        mountEl.appendChild(wrap);

        const trigger = document.getElementById('themeSwitcherTrigger');
        const panel   = document.getElementById('themeSwitcherPanel');

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

    // ─── Init ────────────────────────────────────────────────
    function setup() {
        const { el, mode } = getMountTarget();
        injectStyles(mode);
        injectMarkup(el);
        applyTheme(getSavedTheme());
    }

    function init() {
        // Apply theme ทันที — ก่อน DOM ready เพื่อกัน flash
        document.documentElement.setAttribute('data-theme', getSavedTheme());

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    init();
})();