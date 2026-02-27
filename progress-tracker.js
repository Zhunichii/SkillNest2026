// =========================================
// 📊 PROGRESS TRACKER - ติดตามความคืบหน้าการเรียน
// =========================================
// ใช้กับ Firestore

import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class ProgressTracker {
    constructor(db, userId, courseId) {
        this.db = db;
        this.userId = userId;
        this.courseId = courseId;
        this.enrollmentRef = doc(db, 'enrollments', `${userId}_${courseId}`);
    }

    // === เริ่มต้นการลงทะเบียนคอร์ส ===
    async enrollCourse(totalLessons) {
        try {
            const enrollmentDoc = await getDoc(this.enrollmentRef);
            
            if (!enrollmentDoc.exists()) {
                await setDoc(this.enrollmentRef, {
                    userId: this.userId,
                    courseId: this.courseId,
                    completedLessons: [],
                    progress: 0,
                    totalLessons: totalLessons,
                    lastAccessedLesson: null,
                    enrolledAt: serverTimestamp(),
                    lastUpdatedAt: serverTimestamp()
                });
                
                console.log('✅ ลงทะเบียนคอร์สสำเร็จ');
            }
        } catch (error) {
            console.error('❌ Error enrolling course:', error);
            throw error;
        }
    }

    // === ทำเครื่องหมายบทเรียนว่าเรียนจบแล้ว ===
    async markLessonComplete(lessonId, totalLessons) {
        try {
            const enrollmentDoc = await getDoc(this.enrollmentRef);
            
            if (!enrollmentDoc.exists()) {
                // ถ้ายังไม่ได้ลงทะเบียน ให้ลงทะเบียนก่อน
                await this.enrollCourse(totalLessons);
            }
            
            const data = enrollmentDoc.data() || {};
            const completedLessons = data.completedLessons || [];
            
            // เช็คว่าบทนี้เรียนจบแล้วหรือยัง
            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);
                
                // คำนวณ progress
                const progress = Math.round((completedLessons.length / totalLessons) * 100);
                
                await updateDoc(this.enrollmentRef, {
                    completedLessons: completedLessons,
                    progress: progress,
                    lastAccessedLesson: lessonId,
                    lastUpdatedAt: serverTimestamp()
                });
                
                console.log(`✅ บทเรียน ${lessonId} เรียนจบแล้ว | Progress: ${progress}%`);
                return progress;
            } else {
                console.log(`ℹ️ บทเรียน ${lessonId} เรียนจบไปแล้ว`);
                return data.progress;
            }
        } catch (error) {
            console.error('❌ Error marking lesson complete:', error);
            throw error;
        }
    }

    // === ยกเลิกการทำเครื่องหมายบทเรียน (กรณีต้องการเรียนใหม่) ===
    async unmarkLessonComplete(lessonId, totalLessons) {
        try {
            const enrollmentDoc = await getDoc(this.enrollmentRef);
            
            if (enrollmentDoc.exists()) {
                const data = enrollmentDoc.data();
                let completedLessons = data.completedLessons || [];
                
                // ลบบทเรียนออกจาก array
                completedLessons = completedLessons.filter(id => id !== lessonId);
                
                // คำนวณ progress ใหม่
                const progress = Math.round((completedLessons.length / totalLessons) * 100);
                
                await updateDoc(this.enrollmentRef, {
                    completedLessons: completedLessons,
                    progress: progress,
                    lastUpdatedAt: serverTimestamp()
                });
                
                console.log(`🔄 ยกเลิกเครื่องหมายบทเรียน ${lessonId} | Progress: ${progress}%`);
                return progress;
            }
        } catch (error) {
            console.error('❌ Error unmarking lesson:', error);
            throw error;
        }
    }

    // === อัพเดท Last Accessed Lesson (บทที่กำลังเรียนอยู่) ===
    async updateLastAccessedLesson(lessonId) {
        try {
            const enrollmentDoc = await getDoc(this.enrollmentRef);
            
            if (enrollmentDoc.exists()) {
                await updateDoc(this.enrollmentRef, {
                    lastAccessedLesson: lessonId,
                    lastUpdatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('❌ Error updating last accessed lesson:', error);
        }
    }

    // === ดึงข้อมูลความคืบหน้า ===
    async getProgress() {
        try {
            const enrollmentDoc = await getDoc(this.enrollmentRef);
            
            if (enrollmentDoc.exists()) {
                const data = enrollmentDoc.data();
                return {
                    progress: data.progress || 0,
                    completedLessons: data.completedLessons || [],
                    totalLessons: data.totalLessons || 0,
                    lastAccessedLesson: data.lastAccessedLesson,
                    enrolledAt: data.enrolledAt,
                    lastUpdatedAt: data.lastUpdatedAt
                };
            } else {
                return {
                    progress: 0,
                    completedLessons: [],
                    totalLessons: 0,
                    lastAccessedLesson: null,
                    enrolledAt: null,
                    lastUpdatedAt: null
                };
            }
        } catch (error) {
            console.error('❌ Error getting progress:', error);
            return null;
        }
    }

    // === เช็คว่าบทเรียนนี้เรียนจบแล้วหรือยัง ===
    async isLessonCompleted(lessonId) {
        try {
            const progressData = await this.getProgress();
            return progressData.completedLessons.includes(lessonId);
        } catch (error) {
            console.error('❌ Error checking lesson completion:', error);
            return false;
        }
    }
}

// === ฟังก์ชันสำหรับอัพเดท UI ===
function updateProgressUI(progress, completedLessons) {
    // อัพเดท Progress Bar
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
    
    // อัพเดทเครื่องหมายถูกในรายการบทเรียน
    completedLessons.forEach(lessonId => {
        const lessonElement = document.getElementById(`lesson-${lessonId}`);
        if (lessonElement) {
            lessonElement.classList.add('completed');
            
            // เพิ่มไอคอนเช็คมาร์ค
            const checkmark = lessonElement.querySelector('.checkmark');
            if (!checkmark) {
                const icon = document.createElement('span');
                icon.className = 'checkmark';
                icon.innerHTML = '✓';
                lessonElement.appendChild(icon);
            }
        }
    });
}

// Export
export { ProgressTracker, updateProgressUI };