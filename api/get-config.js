// api/get-config.js
// ส่ง public config (เช่น Pollinations key) ไปยัง client อย่างปลอดภัย
// sk_ key ไม่ควรอยู่ใน client code โดยตรง

export default function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
        pollinationsKey: process.env.POLLINATIONS_KEY || '',
    });
}