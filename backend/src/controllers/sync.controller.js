import { supabase } from "../config/supabase.js";

export const submit = async (req, res, next) => {
  try {
    const ops = (req.body.operations || []).map(op => ({ ...op, user_id: req.user.id }));
    if (!ops.length) return res.status(400).json({ error: "No operations provided" });
    const { data, error } = await supabase.from("sync_queue").insert(ops).select();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
};

export const getQueue = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("sync_queue").select("*").eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
};