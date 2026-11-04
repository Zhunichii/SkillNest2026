// SkillNest — ตัวละคร Avatar AI (SVG สีเต็ม แยกตามอาชีพ) ใช้ร่วมกันใน setting.html และ course-content.html
// ใช้: SN_CHARS.svg('chef', 96) → สตริง <svg> พร้อมแทรกด้วย innerHTML
(function () {
    const SKIN = '#fcd9b6', SKIN_D = '#f0b98a', HAIR = '#2b2250';
    const face = (hair) => `
        <ellipse cx="60" cy="112" rx="34" ry="10" fill="rgba(0,0,0,.18)"/>
        <path d="M24 120c0-22 15-34 36-34s36 12 36 34z" fill="SHIRT"/>
        <rect x="52" y="74" width="16" height="16" rx="6" fill="${SKIN_D}"/>
        <circle cx="60" cy="52" r="27" fill="${SKIN}"/>
        ${hair}
        <circle cx="50" cy="55" r="3.2" fill="#1e1b4b"/><circle cx="70" cy="55" r="3.2" fill="#1e1b4b"/>
        <circle cx="51" cy="54" r="1" fill="#fff"/><circle cx="71" cy="54" r="1" fill="#fff"/>
        <circle cx="43" cy="63" r="4" fill="#f9a8a8" opacity=".5"/><circle cx="77" cy="63" r="4" fill="#f9a8a8" opacity=".5"/>
        <path d="M52 65q8 7 16 0" stroke="#b45309" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const hairShort = `<path d="M33 50c-2-18 11-27 27-27s29 9 27 27c-5-9-14-13-27-13s-22 4-27 13z" fill="${HAIR}"/>`;
    const D = {
        professor: { shirt: '#4f46e5', body: face(hairShort) + `
            <g fill="none" stroke="#312e81" stroke-width="2.4"><rect x="40" y="48" width="16" height="12" rx="5" fill="rgba(129,140,248,.18)"/><rect x="64" y="48" width="16" height="12" rx="5" fill="rgba(129,140,248,.18)"/><path d="M56 53h8"/></g>
            <path d="M60 14L24 28l36 14 36-14z" fill="#1e1b4b"/><path d="M40 35v10c0 5 40 5 40 0V35" fill="#312e81"/>
            <path d="M96 28v14" stroke="#fbbf24" stroke-width="2.4"/><circle cx="96" cy="44" r="3.2" fill="#fbbf24"/>` },
        scientist: { shirt: '#f8fafc', body: face(`<path d="M31 48c-6-8-1-20 8-21 3-8 18-10 24-4 9-3 19 4 17 14 4 3 4 8 1 11-6-7-14-9-25-9s-19 2-25 9z" fill="#cbd5e1"/>`) + `
            <path d="M24 120c0-22 15-34 36-34v34z" fill="#e2e8f0"/><path d="M52 86l8 14 8-14" fill="#94a3b8"/>
            <rect x="38" y="44" width="44" height="13" rx="6.5" fill="rgba(56,189,248,.35)" stroke="#0ea5e9" stroke-width="2.4"/>
            <path d="M96 78l-6 10v14a5 5 0 005 5h8a5 5 0 005-5V88l-6-10z" fill="#a5f3fc" stroke="#0891b2" stroke-width="2"/><rect x="94" y="72" width="8" height="8" fill="#0891b2"/><circle cx="99" cy="98" r="3" fill="#22d3ee"/>` },
        programmer: { shirt: '#0f766e', body: face(`<path d="M32 52c-3-20 9-30 28-30s31 10 28 30c-3-10-12-15-28-15s-25 5-28 15z" fill="#111827"/>`) + `
            <path d="M31 56a29 29 0 0158 0" fill="none" stroke="#475569" stroke-width="5" stroke-linecap="round"/><rect x="26" y="52" width="9" height="16" rx="4.5" fill="#6366f1"/><rect x="85" y="52" width="9" height="16" rx="4.5" fill="#6366f1"/><path d="M30 68q0 12 14 12" fill="none" stroke="#475569" stroke-width="2.4"/>
            <rect x="46" y="96" width="28" height="18" rx="3" fill="#0b1220" stroke="#5eead4" stroke-width="2"/><text x="60" y="109" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#5eead4">&lt;/&gt;</text>` },
        doctor: { shirt: '#f8fafc', body: face(`<path d="M33 48c-1-17 11-26 27-26s28 9 27 26c-4-8-13-12-27-12s-23 4-27 12z" fill="#7c2d12"/>`) + `
            <rect x="46" y="14" width="28" height="12" rx="6" fill="#e2e8f0"/><circle cx="60" cy="20" r="6" fill="#94a3b8"/><circle cx="60" cy="20" r="3.4" fill="#e0f2fe"/>
            <path d="M42 90c0 14 8 20 18 20s18-6 18-20" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="112" r="4.4" fill="#38bdf8" stroke="#475569" stroke-width="2"/>
            <rect x="83" y="96" width="14" height="14" rx="3" fill="#fff" stroke="#e11d48" stroke-width="1.6"/><path d="M90 99v8M86 103h8" stroke="#e11d48" stroke-width="2.4" stroke-linecap="round"/>` },
        artist: { shirt: '#db2777', body: face(`<path d="M32 54c-4-18 8-30 28-30s32 12 28 30c-3-9-13-14-28-14s-25 5-28 14z" fill="#92400e"/>`) + `
            <ellipse cx="60" cy="26" rx="30" ry="10" fill="#dc2626"/><circle cx="60" cy="14" r="4" fill="#dc2626"/><ellipse cx="44" cy="29" rx="14" ry="5" fill="#b91c1c"/>
            <ellipse cx="94" cy="98" rx="15" ry="11" fill="#fde68a" stroke="#b45309" stroke-width="1.8"/><circle cx="88" cy="95" r="3" fill="#ef4444"/><circle cx="95" cy="92" r="3" fill="#3b82f6"/><circle cx="100" cy="98" r="3" fill="#22c55e"/><circle cx="91" cy="102" r="2.4" fill="#fff"/>
            <path d="M30 108l16-20" stroke="#92400e" stroke-width="3.4" stroke-linecap="round"/><path d="M44 90l5-5" stroke="#a855f7" stroke-width="5" stroke-linecap="round"/>` },
        chef: { shirt: '#f8fafc', body: face(`<path d="M34 48c0-14 10-22 26-22s26 8 26 22c-5-7-14-10-26-10s-21 3-26 10z" fill="#78350f"/>`) + `
            <path d="M36 32c-9-1-13-12-6-17 4-3 9-2 12 1 2-9 14-11 18-4 4-8 17-6 18 3 7-1 12 6 9 12-2 3-6 5-10 4v12H42V31c-2 1-4 1-6 1z" fill="#fff" stroke="#e2e8f0" stroke-width="1.6"/><rect x="42" y="30" width="36" height="7" fill="#e2e8f0"/>
            <path d="M44 84l16 14 16-14" fill="#ef4444"/><path d="M52 92l8 8 8-8" fill="#dc2626"/>
            <circle cx="50" cy="104" r="1.8" fill="#cbd5e1"/><circle cx="60" cy="108" r="1.8" fill="#cbd5e1"/><circle cx="70" cy="104" r="1.8" fill="#cbd5e1"/>` }
    };
    window.SN_CHARS = {
        keys: Object.keys(D),
        svg(key, size) {
            const d = D[key] || D.professor;
            const s = size || 96;
            return `<svg class="sn-char-svg" width="${s}" height="${s}" viewBox="0 0 120 120" role="img" aria-label="${key}">${d.body.replace('SHIRT', d.shirt)}</svg>`;
        }
    };
})();