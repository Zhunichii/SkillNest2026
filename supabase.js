import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://jgqulowoebbzmnasmrdz.supabase.co/"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpncXVsb3dvZWJiem1uYXNtcmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjY1NzAsImV4cCI6MjA5MDIwMjU3MH0.80JzT7-0W0w_c_1ioPhFUZXk31iIwY28PEtJl5ul-vg"                

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: ดึง user ปัจจุบัน พร้อม profile จาก users table
export async function getCurrentUserWithProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return { ...user, profile };
}

// Helper: ส่ง notification
export async function sendNotification({ type, title, message, link = null, targetUserId = 'broadcast' }) {
  const { error } = await supabase
    .from('notifications')
    .insert({ type, title, message, link, target_user_id: targetUserId, read_by: [] });
  if (error) console.error('sendNotification error:', error);
}