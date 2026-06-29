import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Check the connection on startup and print a message
export async function checkSupabase() {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    console.log("Supabase connected");
  } catch (e) {
    console.warn("Supabase not connected:", e.message);
  }
}