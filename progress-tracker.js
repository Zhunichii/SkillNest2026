// =========================================
// 📊 PROGRESS TRACKER - ติดตามความคืบหน้าการเรียน
// =========================================
// ใช้กับ Supabase (แทน Firestore)

import { supabase } from './supabase.js';

class ProgressTracker {
    constructor(userId, courseId) {
        this.userId = userId;
        this.courseId = courseId;
    }

    // === เริ่มต้นการลงทะเบียนคอร์ส ===
    async enrollCourse(totalLessons) {
        try {
            const { data: existing } = await supabase
                .from('enrollments')
                .select('id')
                .eq('user_id', this.userId)
                .eq('course_id', this.courseId)
                .single();

            if (!existing) {
                const { error } = await supabase
                    .from('enrollments')
                    .insert({
                        user_id: this.userId,
                        course_id: this.courseId,
                        completed_lessons: [],
                        progress: 0,
                        total_lessons: totalLessons,
                        last_accessed_lesson: null,
                        enrolled_at: new Date().toISOString(),
                        last_updated_at: new Date().toISOString()
                    });
                if (error) throw error;
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
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('*')
                .eq('user_id', this.userId)
                .eq('course_id', this.courseId)
                .single();

            if (!enrollment) await this.enrollCourse(totalLessons);

            const completedLessons = enrollment?.completed_lessons || [];

            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);
                const progress = Math.round((completedLessons.length / totalLessons) * 100);

                const { error } = await supabase
                    .from('enrollments')
                    .update({
                        completed_lessons: completedLessons,
                        progress,
                        last_accessed_lesson: lessonId,
                        last_updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId)
                    .eq('course_id', this.courseId);

                if (error) throw error;
                console.log(`✅ บทเรียน ${lessonId} เรียนจบแล้ว | Progress: ${progress}%`);
                return progress;
            } else {
                console.log(`ℹ️ บทเรียน ${lessonId} เรียนจบไปแล้ว`);
                return enrollment?.progress || 0;
            }
        } catch (error) {
            console.error('❌ Error marking lesson complete:', error);
            throw error;
        }
    }

    // === ยกเลิกการทำเครื่องหมายบทเรียน ===
    async unmarkLessonComplete(lessonId, totalLessons) {
        try {
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('*')
                .eq('user_id', this.userId)
                .eq('course_id', this.courseId)
                .single();

            if (enrollment) {
                const completedLessons = (enrollment.completed_lessons || []).filter(id => id !== lessonId);
                const progress = Math.round((completedLessons.length / totalLessons) * 100);

                const { error } = await supabase
                    .from('enrollments')
                    .update({
                        completed_lessons: completedLessons,
                        progress,
                        last_updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId)
                    .eq('course_id', this.courseId);

                if (error) throw error;
                return progress;
            }
        } catch (error) {
            console.error('❌ Error unmarking lesson:', error);
            throw error;
        }
    }

    // === อัพเดท Last Accessed Lesson ===
    async updateLastAccessedLesson(lessonId) {
        try {
            await supabase
                .from('enrollments')
                .update({ last_accessed_lesson: lessonId, last_updated_at: new Date().toISOString() })
                .eq('user_id', this.userId)
                .eq('course_id', this.courseId);
        } catch (error) {
            console.error('❌ Error updating last accessed lesson:', error);
        }
    }

    // === ดึงข้อมูลความคืบหน้า ===
    async getProgress() {
        try {
            const { data: enrollment } = await supabase
                .from('enrollments')
                .select('*')
                .eq('user_id', this.userId)
                .eq('course_id', this.courseId)
                .single();

            if (!enrollment) return { progress: 0, completedLessons: [], totalLessons: 0, lastAccessedLesson: null, enrolledAt: null, lastUpdatedAt: null };

            return {
                progress: enrollment.progress || 0,
                completedLessons: enrollment.completed_lessons || [],
                totalLessons: enrollment.total_lessons || 0,
                lastAccessedLesson: enrollment.last_accessed_lesson,
                enrolledAt: enrollment.enrolled_at,
                lastUpdatedAt: enrollment.last_updated_at
            };
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
            return false;
        }
    }
}

// === ฟังก์ชันสำหรับอัพเดท UI ===
function updateProgressUI(progress, completedLessons) {
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;

    completedLessons.forEach(lessonId => {
        const lessonElement = document.getElementById(`lesson-${lessonId}`);
        if (lessonElement) {
            lessonElement.classList.add('completed');
            if (!lessonElement.querySelector('.checkmark')) {
                const icon = document.createElement('span');
                icon.className = 'checkmark';
                icon.innerHTML = '✓';
                lessonElement.appendChild(icon);
            }
        }
    });
}

export { ProgressTracker, updateProgressUI };
