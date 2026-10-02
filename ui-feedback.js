/* ════════════════════════════════════════════════════════════
   SkillNest — Shared UI Feedback (toast + confirm modal)
   แทนที่ alert()/confirm() ของเบราว์เซอร์ด้วย UI ที่เข้าธีมเว็บ
   ใช้งาน:
     toast('บันทึกสำเร็จ', 'success')
     toast('เกิดข้อผิดพลาด', 'error')
     const ok = await confirmDialog('ต้องการลบรายการนี้ใช่ไหม?', {
         title: 'ยืนยันการลบ',
         confirmText: 'ลบ',
         cancelText: 'ยกเลิก',
         danger: true
     });
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const ICONS = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    const QUESTION_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 115.83 1c0 2-3 2.5-3 4.5"/><path d="M12 17h.01"/></svg>';

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureContainer() {
        let c = document.getElementById('snToastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'snToastContainer';
            c.className = 'sn-toast-container';
            c.setAttribute('aria-live', 'polite');
            c.setAttribute('role', 'status');
            document.body.appendChild(c);
        }
        return c;
    }

    /**
     * toast(message, type, opts)
     * type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
     * opts.duration: ms ก่อนหายไปเอง (default 4000, 0 = ไม่หายเอง)
     */
    function toast(message, type, opts) {
        type = (type && ICONS[type]) ? type : 'info';
        opts = opts || {};
        const duration = opts.duration !== undefined ? opts.duration : 4000;

        const container = ensureContainer();
        const el = document.createElement('div');
        el.className = 'sn-toast sn-toast-' + type;
        el.innerHTML =
            '<span class="sn-toast-icon">' + ICONS[type] + '</span>' +
            '<span class="sn-toast-msg"></span>' +
            '<button type="button" class="sn-toast-close" aria-label="ปิด">' + CLOSE_ICON + '</button>';
        el.querySelector('.sn-toast-msg').textContent = message;

        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));

        let timer = null;
        const remove = () => {
            if (timer) clearTimeout(timer);
            el.classList.remove('show');
            el.classList.add('hide');
            setTimeout(() => el.remove(), 220);
        };
        el.querySelector('.sn-toast-close').addEventListener('click', remove);
        if (duration > 0) timer = setTimeout(remove, duration);

        return { close: remove };
    }

    /**
     * confirmDialog(message, opts) -> Promise<boolean>
     * opts: { title, confirmText, cancelText, danger }
     */
    function confirmDialog(message, opts) {
        opts = opts || {};
        const title = opts.title || 'ยืนยันการทำรายการ';
        const confirmText = opts.confirmText || 'ยืนยัน';
        const cancelText = opts.cancelText || 'ยกเลิก';
        const danger = !!opts.danger;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'sn-confirm-overlay';
            overlay.innerHTML =
                '<div class="sn-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="snConfirmTitle">' +
                    '<div class="sn-confirm-icon ' + (danger ? 'sn-confirm-icon-danger' : '') + '">' + QUESTION_ICON + '</div>' +
                    '<h3 class="sn-confirm-title" id="snConfirmTitle"></h3>' +
                    '<p class="sn-confirm-msg"></p>' +
                    '<div class="sn-confirm-actions">' +
                        '<button type="button" class="sn-confirm-btn sn-confirm-cancel"></button>' +
                        '<button type="button" class="sn-confirm-btn ' + (danger ? 'sn-confirm-danger' : 'sn-confirm-primary') + '"></button>' +
                    '</div>' +
                '</div>';

            overlay.querySelector('.sn-confirm-title').textContent = title;
            overlay.querySelector('.sn-confirm-msg').textContent = message;
            overlay.querySelector('.sn-confirm-cancel').textContent = cancelText;
            overlay.querySelector('.sn-confirm-cancel + button').textContent = confirmText;

            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => overlay.classList.add('show'));

            const cancelBtn = overlay.querySelector('.sn-confirm-cancel');
            const confirmBtn = overlay.querySelector('.sn-confirm-cancel + button');

            function close(result) {
                document.removeEventListener('keydown', onKeydown);
                overlay.classList.remove('show');
                document.body.style.overflow = '';
                setTimeout(() => overlay.remove(), 180);
                resolve(result);
            }
            function onKeydown(e) {
                if (e.key === 'Escape') close(false);
                if (e.key === 'Enter') close(true);
            }

            cancelBtn.addEventListener('click', () => close(false));
            confirmBtn.addEventListener('click', () => close(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
            document.addEventListener('keydown', onKeydown);

            setTimeout(() => confirmBtn.focus(), 50);
        });
    }

    /**
     * skeletonRows(n) -> HTML string ของแถว skeleton n แถว (ใช้แทนรายการที่กำลังโหลด เช่น list บทเรียน/คอร์ส)
     */
    function skeletonRows(n) {
        n = n || 3;
        let html = '';
        for (let i = 0; i < n; i++) {
            html += '<div class="sn-skeleton-row"><div class="sn-skeleton-avatar"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px;"><div class="sn-skeleton-line w-60"></div><div class="sn-skeleton-line w-30"></div></div></div>';
        }
        return html;
    }

    /**
     * skeletonCards(n) -> HTML string ของการ์ด skeleton n ใบ (ใช้แทน grid การ์ดที่กำลังโหลด เช่น รายการคอร์ส)
     */
    function skeletonCards(n) {
        n = n || 3;
        let html = '';
        for (let i = 0; i < n; i++) {
            html += '<div class="sn-skeleton-card"><div class="sn-skeleton-line w-60"></div><div class="sn-skeleton-line w-40"></div><div class="sn-skeleton-line w-30"></div></div>';
        }
        return html;
    }

    window.toast = toast;
    window.confirmDialog = confirmDialog;
    window.snEscapeHtml = escapeHtml;
    window.skeletonRows = skeletonRows;
    window.skeletonCards = skeletonCards;
})();