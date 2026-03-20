// api/upload.js
// Vercel Serverless Function สำหรับอัพโหลดไฟล์ไป GitHub

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, path, content, message } = req.body;

        // GitHub Configuration (เก็บใน Environment Variables)
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
        const GITHUB_REPO = process.env.GITHUB_REPO;

        if (!GITHUB_TOKEN || !GITHUB_USERNAME || !GITHUB_REPO) {
            return res.status(500).json({ 
                error: 'Server configuration error' 
            });
        }

        if (action === 'upload-file') {
            // อัพโหลดไฟล์ไป GitHub
            const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message || `Upload ${path}`,
                    content: content // base64
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(response.status).json({ error: error.message });
            }

            const data = await response.json();
            
            // Return raw URL
            const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${path}`;
            
            return res.status(200).json({ 
                success: true, 
                url: rawUrl,
                sha: data.content.sha
            });
        }

        else if (action === 'update-courses') {
            // อัพเดท courses.json
            const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/courses.json`;
            
            // ดึงไฟล์เดิม
            let sha = null;
            let existingCourses = [];
            
            try {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`
                    }
                });
                
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    sha = data.sha;
                    const contentDecoded = Buffer.from(data.content, 'base64').toString('utf-8');
                    existingCourses = JSON.parse(contentDecoded);
                }
            } catch (e) {
                console.log('courses.json not found, creating new');
            }

            // เพิ่มคอร์สใหม่
            const newCourse = req.body.courseData;
            existingCourses.push(newCourse);

            // Encode to base64
            const updatedContent = Buffer.from(
                JSON.stringify(existingCourses, null, 2)
            ).toString('base64');

            // Upload
            const putResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Add course: ${newCourse.title}`,
                    content: updatedContent,
                    sha: sha
                })
            });

            if (!putResponse.ok) {
                const error = await putResponse.json();
                return res.status(putResponse.status).json({ error: error.message });
            }

            return res.status(200).json({ 
                success: true,
                courseId: newCourse.id
            });
        }

        else if (action === 'get-courses') {
            // ดึงรายการคอร์ส
            const url = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/courses.json`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                return res.status(200).json({ courses: [] });
            }

            const courses = await response.json();
            return res.status(200).json({ courses });
        }

        else {
            return res.status(400).json({ error: 'Invalid action' });
        }

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal server error' 
        });
    }
}