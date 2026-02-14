// =========================================
// 📤 FILE UPLOAD HANDLER FOR SKILLNEST
// =========================================
// ใช้กับ Cloudinary หรือ Firebase Storage

const CLOUDINARY_CONFIG = {
    cloudName: 'dtuwwmmO',
    uploadPreset: 'skillnest_uploads' // สร้างใน Cloudinary Dashboard
};

class FileUploadHandler {
    constructor() {
        this.supportedTypes = {
            video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            pdf: ['pdf'],
            audio: ['mp3', 'wav', 'ogg'],
            document: ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']
        };
    }

    // ตรวจสอบประเภทไฟล์
    detectFileType(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        for (const [type, extensions] of Object.entries(this.supportedTypes)) {
            if (extensions.includes(extension)) {
                return type;
            }
        }
        
        return 'unknown';
    }

    // อัปโหลดไฟล์ไป Cloudinary
    async uploadToCloudinary(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        
        const fileType = this.detectFileType(file);
        let resourceType = 'auto';
        
        // กำหนด resource_type ตามประเภทไฟล์
        if (fileType === 'video') resourceType = 'video';
        else if (fileType === 'image') resourceType = 'image';
        else resourceType = 'raw'; // สำหรับ PDF, documents, etc.

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Upload failed: ' + response.statusText);
            }

            const data = await response.json();
            
            // แปลง URL ให้เหมาะสมกับการแสดงผล
            let finalUrl = data.secure_url;
            
            // สำหรับ PDF และเอกสาร ให้ใช้ /fl_attachment/ เพื่อให้แสดงผลได้
            if (fileType === 'pdf' || fileType === 'document') {
                finalUrl = data.secure_url.replace('/raw/upload/', '/image/upload/fl_attachment/');
            }

            return {
                success: true,
                url: finalUrl,
                publicId: data.public_id,
                type: fileType,
                originalFilename: file.name,
                size: data.bytes,
                format: data.format
            };

        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // สร้าง input element สำหรับอัปโหลด
    createUploadInput(acceptTypes = '*', multiple = false) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = multiple;
        
        // กำหนดประเภทไฟล์ที่รับ
        if (acceptTypes !== '*') {
            const extensions = this.supportedTypes[acceptTypes];
            if (extensions) {
                input.accept = extensions.map(ext => '.' + ext).join(',');
            }
        }
        
        return input;
    }
}

// Export สำหรับใช้งาน
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUploadHandler;
}