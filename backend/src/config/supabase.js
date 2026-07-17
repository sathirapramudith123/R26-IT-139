import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function checkSupabase() {
  try {
    const { error } = await supabase.from("users").select("user_id").limit(1);
    if (error) throw error;
    console.log("Supabase connected");
  } catch (e) {
    console.error("Supabase connection failed:", e.message);
  }
}