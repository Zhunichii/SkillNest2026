// middleware.js
// ใส่ header Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy ให้เฉพาะ "course-content"
// เพื่อเปิด SharedArrayBuffer (ให้ Python IDE ทำ terminal โต้ตอบสดได้)
//
// ทำไมต้องเช็ค User-Agent ก่อน:
// หน้านี้มีการฝัง YouTube ผ่าน <iframe credentialless> ด้วย ซึ่งต้องอาศัยฟีเจอร์
// "iframe credentialless" ของเบราว์เซอร์ในการข้าม COEP ให้กับ iframe ข้ามโดเมนที่เราคุมไม่ได้
// ฟีเจอร์นี้เสถียรเฉพาะใน Chrome/Edge/Opera (Chromium) ตั้งแต่ v110 ขึ้นไปเท่านั้น
// Firefox และ Safari ยังรองรับไม่สมบูรณ์ (มี bug ที่ยังไม่แก้ ทำให้ iframe โหลดไม่ขึ้นเลย)
// ถ้าใส่ header ให้ทุกเบราว์เซอร์แบบไม่เลือก จะทำให้ผู้ใช้ Firefox/Safari เปิดวิดีโอ YouTube ไม่ได้
//
// ดังนั้น: เบราว์เซอร์ที่รองรับจริง → ได้ header + terminal โต้ตอบสด
//          เบราว์เซอร์ที่ยังไม่รองรับ → ไม่ใส่ header เลย (หน้าเว็บทำงานปกติ, Python IDE
//          จะ fallback เป็นโหมด "กรอก Input ล่วงหน้า" อัตโนมัติอยู่แล้วในโค้ดฝั่ง client)

export const config = {
    matcher: ['/course-content', '/course-content.html'],
};

function supportsCredentiallessIframe(userAgent) {
    const ua = userAgent || '';

    // Firefox และ Safari (ที่ไม่ใช่ Chromium) ยังไม่รองรับ iframe credentialless อย่างสมบูรณ์
    const isFirefox = /Firefox\//.test(ua);
    const isChromiumBased = /Chrom(e|ium)\//.test(ua) || /Edg\//.test(ua) || /OPR\//.test(ua);
    const isSafariOnly = /Safari\//.test(ua) && !isChromiumBased;

    if (isFirefox || isSafariOnly) return false;

    // ต้องเป็น Chromium ตั้งแต่เวอร์ชัน 110 ขึ้นไป (iframe credentialless เปิดใช้ default ตั้งแต่ v110)
    const match = ua.match(/Chrom(?:e|ium)\/(\d+)/);
    const version = match ? parseInt(match[1], 10) : 0;
    return isChromiumBased && version >= 110;
}

export default async function middleware(request) {
    const userAgent = request.headers.get('user-agent') || '';

    // ดึงหน้าตามปกติจาก origin (ไฟล์ static เดิม) ก่อนเสมอ
    const response = await fetch(request);

    if (!supportsCredentiallessIframe(userAgent)) {
        // เบราว์เซอร์นี้ยังไม่รองรับ iframe credentialless ดีพอ → ปล่อยผ่านแบบไม่แตะ header
        // (สำคัญมาก: กัน YouTube พังสำหรับ Firefox/Safari)
        return response;
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
    newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}