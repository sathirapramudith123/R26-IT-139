import { supabase } from "../config/supabase.js";
const TABLE = "procurement";

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert({ ...req.body, user_id: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
};

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from(TABLE).select("*").eq("id", req.params.id)
      .eq("user_id", req.user.id).maybeSingle();
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from(TABLE).update(req.body).eq("id", req.params.id)
      .eq("user_id", req.user.id).select().maybeSingle();
    if (!data) return res.status(404).json({ error: "Not found" });
    res.json(data);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from(TABLE).select("id").eq("id", req.params.id)
      .eq("user_id", req.user.id).maybeSingle();
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { error } = await supabase
      .from(TABLE).delete().eq("id", req.params.id).eq("user_id", req.user.id);
    if (error) throw error;

    res.json({ message: "Deleted" });
  } catch (e) { next(e); }
};