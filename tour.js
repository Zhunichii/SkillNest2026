/**
 * tour.js — ระบบ Tutorial แบบทีละ Step (spotlight + tooltip) ใช้ร่วมกันได้ทุกหน้าของ SkillNest
 *
 * วิธีใช้ในแต่ละหน้า:
 *   <script src="tour.js"></script>
 *   <script>
 *     const steps = [
 *       { target: '#someElement', title: 'หัวข้อ', text: 'คำอธิบาย', placement: 'bottom' },
 *       { title: 'ไม่มี target ก็ได้', text: 'จะขึ้นกลางจอแทน (เช่น slide ต้อนรับ)' },
 *     ];
 *     SkillNestTour.autoStart(steps, 'course-content'); // โชว์อัตโนมัติแค่ครั้งแรก (จำผ่าน localStorage)
 *     document.getElementById('helpBtn').onclick = () => SkillNestTour.start(steps, 'course-content'); // เปิดดูซ้ำได้ทุกเมื่อ
 *   </script>
 */
(function () {
    let steps = [];
    let currentIndex = 0;
    let storageKey = '';
    let els = {};

    function injectStyles() {
        if (document.getElementById('sntourStyles')) return;
        const style = document.createElement('style');
        style.id = 'sntourStyles';
        style.textContent = `
            .sntour-overlay {
                position: fixed; inset: 0; z-index: 99998;
                background: rgba(6,8,20,0.72);
                opacity: 0; transition: opacity 0.25s ease;
                pointer-events: none;
            }
            .sntour-overlay.show { opacity: 1; pointer-events: all; }
            .sntour-spotlight {
                position: fixed; z-index: 99999;
                border-radius: 12px;
                box-shadow: 0 0 0 9999px rgba(6,8,20,0.72), 0 0 0 3px #3b82f6, 0 0 26px 4px rgba(59,130,246,0.55);
                transition: top 0.35s cubic-bezier(0.22,1,0.36,1), left 0.35s cubic-bezier(0.22,1,0.36,1),
                            width 0.35s cubic-bezier(0.22,1,0.36,1), height 0.35s cubic-bezier(0.22,1,0.36,1),
                            opacity 0.2s ease;
                pointer-events: none;
                opacity: 0;
            }
            .sntour-spotlight.show { opacity: 1; }
            .sntour-spotlight.sntour-nospot { box-shadow: 0 0 0 9999px rgba(6,8,20,0.72); }
            .sntour-card {
                position: fixed; z-index: 100000;
                width: 320px; max-width: calc(100vw - 32px);
                background: #14162b; color: #fff;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 16px;
                padding: 20px 22px 18px;
                box-shadow: 0 24px 60px -20px rgba(0,0,0,0.7);
                font-family: 'Inter','IBM Plex Sans Thai',sans-serif;
                opacity: 0; transform: translateY(6px);
                transition: opacity 0.25s ease, transform 0.25s ease, top 0.35s cubic-bezier(0.22,1,0.36,1), left 0.35s cubic-bezier(0.22,1,0.36,1);
                pointer-events: none;
            }
            .sntour-card.show { opacity: 1; transform: translateY(0); pointer-events: all; }
            .sntour-step-count { font-size: 0.74rem; color: #8b9bd6; font-weight: 600; letter-spacing: 0.03em; margin-bottom: 6px; text-transform: uppercase; }
            .sntour-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; line-height: 1.4; }
            .sntour-text { font-size: 0.88rem; color: #c3c7db; line-height: 1.6; margin-bottom: 16px; }
            .sntour-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
            .sntour-dots { display: flex; gap: 5px; }
            .sntour-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.18); transition: background 0.2s, transform 0.2s; }
            .sntour-dot.active { background: #3b82f6; transform: scale(1.3); }
            .sntour-btns { display: flex; gap: 8px; }
            .sntour-btn {
                border: none; border-radius: 8px; padding: 7px 14px; font-size: 0.82rem; font-weight: 600;
                cursor: pointer; font-family: inherit; transition: opacity 0.15s, background 0.15s;
            }
            .sntour-btn-skip { background: transparent; color: #8b93b0; padding: 7px 8px; }
            .sntour-btn-skip:hover { color: #fff; }
            .sntour-btn-prev { background: rgba(255,255,255,0.08); color: #e5e7eb; }
            .sntour-btn-prev:hover { background: rgba(255,255,255,0.15); }
            .sntour-btn-next { background: #3b82f6; color: #fff; }
            .sntour-btn-next:hover { background: #2563eb; }
            .sntour-help-fab {
                position: fixed; bottom: 24px; left: 24px; z-index: 900;
                width: 44px; height: 44px; border-radius: 50%;
                background: linear-gradient(135deg,#8b5cf6,#3b82f6); color: #fff;
                border: none; cursor: pointer; font-size: 1.1rem; font-weight: 700;
                box-shadow: 0 8px 22px -8px rgba(59,130,246,0.6);
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.15s;
            }
            .sntour-help-fab:hover { transform: scale(1.08); }
            @media (max-width: 640px) {
                .sntour-card { width: calc(100vw - 32px); }
                .sntour-help-fab { bottom: 16px; left: 16px; width: 40px; height: 40px; font-size: 1rem; }
            }
        `;
        document.head.appendChild(style);
    }

    function buildDOM() {
        if (els.overlay) return;
        const overlay = document.createElement('div');
        overlay.className = 'sntour-overlay';
        const spotlight = document.createElement('div');
        spotlight.className = 'sntour-spotlight';
        const card = document.createElement('div');
        card.className = 'sntour-card';
        card.innerHTML = `
            <div class="sntour-step-count" id="sntourCount"></div>
            <div class="sntour-title" id="sntourTitle"></div>
            <div class="sntour-text" id="sntourText"></div>
            <div class="sntour-footer">
                <div class="sntour-dots" id="sntourDots"></div>
                <div class="sntour-btns">
                    <button class="sntour-btn sntour-btn-skip" id="sntourSkip">ข้าม</button>
                    <button class="sntour-btn sntour-btn-prev" id="sntourPrev">ย้อนกลับ</button>
                    <button class="sntour-btn sntour-btn-next" id="sntourNext">ถัดไป</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.appendChild(spotlight);
        document.body.appendChild(card);
        els = {
            overlay, spotlight, card,
            count: card.querySelector('#sntourCount'),
            title: card.querySelector('#sntourTitle'),
            text:  card.querySelector('#sntourText'),
            dots:  card.querySelector('#sntourDots'),
            skip:  card.querySelector('#sntourSkip'),
            prev:  card.querySelector('#sntourPrev'),
            next:  card.querySelector('#sntourNext'),
        };
        els.skip.onclick = finish;
        els.prev.onclick = () => go(currentIndex - 1);
        els.next.onclick = () => {
            if (currentIndex >= steps.length - 1) finish();
            else go(currentIndex + 1);
        };
        overlay.onclick = (e) => { if (e.target === overlay) finish(); };
        document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (!els.overlay || !els.overlay.classList.contains('show')) return;
        if (e.key === 'Escape') finish();
        if (e.key === 'ArrowRight') els.next.click();
        if (e.key === 'ArrowLeft' && currentIndex > 0) go(currentIndex - 1);
    }

    function positionFor(target, cardW, cardH, placement) {
        const pad = 14;
        const vw = window.innerWidth, vh = window.innerHeight;
        if (!target) {
            return { top: vh / 2 - cardH / 2, left: vw / 2 - cardW / 2 };
        }
        const r = target.getBoundingClientRect();
        let top, left;
        const spaceBelow = vh - r.bottom, spaceAbove = r.top, spaceRight = vw - r.right, spaceLeft = r.left;
        let place = placement;
        if (!place) {
            if (spaceBelow > cardH + pad + 10) place = 'bottom';
            else if (spaceAbove > cardH + pad + 10) place = 'top';
            else if (spaceRight > cardW + pad + 10) place = 'right';
            else if (spaceLeft > cardW + pad + 10) place = 'left';
            else place = 'bottom';
        }
        if (place === 'bottom') { top = r.bottom + pad; left = r.left + r.width / 2 - cardW / 2; }
        else if (place === 'top') { top = r.top - cardH - pad; left = r.left + r.width / 2 - cardW / 2; }
        else if (place === 'right') { top = r.top + r.height / 2 - cardH / 2; left = r.right + pad; }
        else { top = r.top + r.height / 2 - cardH / 2; left = r.left - cardW - pad; }

        left = Math.max(12, Math.min(left, vw - cardW - 12));
        top  = Math.max(12, Math.min(top, vh - cardH - 12));
        return { top, left };
    }

    function go(index) {
        if (index < 0 || index >= steps.length) return;
        currentIndex = index;
        const step = steps[index];
        const target = step.target ? document.querySelector(step.target) : null;

        if (target) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }

        // รอ scroll นิ่งก่อนค่อยวางตำแหน่ง spotlight/card (กันตำแหน่งเพี้ยนตอนกำลังเลื่อน)
        setTimeout(() => {
            if (target) {
                const r = target.getBoundingClientRect();
                els.spotlight.classList.remove('sntour-nospot');
                els.spotlight.style.top    = (r.top - 8) + 'px';
                els.spotlight.style.left   = (r.left - 8) + 'px';
                els.spotlight.style.width  = (r.width + 16) + 'px';
                els.spotlight.style.height = (r.height + 16) + 'px';
            } else {
                els.spotlight.classList.add('sntour-nospot');
                els.spotlight.style.top = '50%'; els.spotlight.style.left = '50%';
                els.spotlight.style.width = '0px'; els.spotlight.style.height = '0px';
            }
            els.spotlight.classList.add('show');

            els.count.textContent = `ขั้นตอนที่ ${index + 1} จาก ${steps.length}`;
            els.title.textContent = step.title || '';
            els.text.innerHTML    = step.text || '';
            els.dots.innerHTML = steps.map((_, i) => `<span class="sntour-dot ${i === index ? 'active' : ''}"></span>`).join('');
            els.prev.style.visibility = index === 0 ? 'hidden' : 'visible';
            els.next.textContent = index === steps.length - 1 ? 'เริ่มใช้งานเลย' : 'ถัดไป';

            const cardW = Math.min(320, window.innerWidth - 32);
            const cardH = els.card.offsetHeight || 180;
            const pos = positionFor(target, cardW, cardH, step.placement);
            els.card.style.top  = pos.top + 'px';
            els.card.style.left = pos.left + 'px';
            els.card.classList.add('show');
        }, target ? 260 : 0);
    }

    function finish() {
        els.overlay.classList.remove('show');
        els.spotlight.classList.remove('show');
        els.card.classList.remove('show');
        if (storageKey) localStorage.setItem(storageKey, '1');
    }

    function start(tourSteps, key) {
        if (!tourSteps || !tourSteps.length) return;
        injectStyles();
        buildDOM();
        steps = tourSteps;
        storageKey = key ? ('sntour_seen_' + key) : '';
        currentIndex = 0;
        els.overlay.classList.add('show');
        go(0);
    }

    function autoStart(tourSteps, key) {
        if (key && localStorage.getItem('sntour_seen_' + key)) return;
        start(tourSteps, key);
    }

    function reset(key) {
        if (key) localStorage.removeItem('sntour_seen_' + key);
    }

    // ปุ่มลอย "?" มุมซ้ายล่าง ไว้เปิดทัวร์ดูซ้ำได้ทุกเมื่อ
    function mountHelpButton(tourSteps, key, label) {
        injectStyles();
        if (document.getElementById('sntourHelpFab')) return;
        const btn = document.createElement('button');
        btn.id = 'sntourHelpFab';
        btn.className = 'sntour-help-fab';
        btn.title = label || 'ดูวิธีใช้งานหน้านี้อีกครั้ง';
        btn.textContent = '?';
        btn.onclick = () => start(tourSteps, key);
        document.body.appendChild(btn);
    }

    window.SkillNestTour = { start, autoStart, reset, mountHelpButton };
})();
