import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";

const TABLE = "notifications";
const ID = "notification_id";

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(toClientList(data, ID));
  } catch (e) { next(e); }
};

export const unreadCount = async (req, res, next) => {
  try {
    const { count, error } = await supabase
      .from(TABLE).select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id).eq("is_read", false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (e) { next(e); }
};

export const markRead = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id)
      .select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Notification not found" });
    res.json(toClient(data, ID));
  } catch (e) { next(e); }
};

export const markAllRead = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", req.user.id).eq("is_read", false);
    if (error) throw error;
    res.json({ message: "All notifications marked as read" });
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Notification deleted" });
  } catch (e) { next(e); }
};

export async function notify(userId, { title, message, type = "INFO", category, link }) {
  try {
    await supabase.from(TABLE).insert([{
      user_id: userId,
      title,
      message,
      notification_type: up(type),
      notification_category: category ? up(category) : null,
      link: link || null,
    }]);
  } catch (e) {
    console.error("[notify] failed:", e.message);
  }
}