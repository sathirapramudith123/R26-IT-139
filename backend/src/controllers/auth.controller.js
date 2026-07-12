import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { supabase } from "../config/supabase.js";

const signToken = (u) =>
  jwt.sign({ id: u.user_id, email: u.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const publicUser = (u) => ({
  id: u.user_id,
  user_code: u.user_code,
  full_name: u.full_name,
  email: u.email,
});

export const register = async (req, res, next) => {
  try {
    const name = req.body.fullName || req.body.full_name;
    const { email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "fullName, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const { data: existing } = await supabase
      .from("users").select("user_id").eq("email", email).maybeSingle();
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("users")
      .insert([{ full_name: name, email, password_hash }])
      .select().single();
    if (error) throw error;

    res.status(201).json({ message: "Account created", user: publicUser(data) });
  } catch (e) { next(e); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const { data: user } = await supabase
      .from("users").select("*").eq("email", email).maybeSingle();
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    await supabase.from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", user.user_id);

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const { data: user } = await supabase
      .from("users").select("user_id").eq("email", email).maybeSingle();
    if (!user)
      return res.json({ message: "If that email exists, a reset token was generated" });

    const reset_token = crypto.randomBytes(32).toString("hex");
    const reset_token_expiry = new Date(Date.now() + 3600_000).toISOString();

    await supabase.from("users")
      .update({ reset_token, reset_token_expiry })
      .eq("user_id", user.user_id);

    res.json({
      message: "If that email exists, a reset token was generated",
      resetToken: reset_token, // dev only
    });
  } catch (e) { next(e); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "token and password are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const { data: user } = await supabase
      .from("users").select("*").eq("reset_token", token).maybeSingle();

    if (!user || !user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date())
      return res.status(400).json({ error: "Invalid or expired reset token" });

    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from("users")
      .update({ password_hash, reset_token: null, reset_token_expiry: null })
      .eq("user_id", user.user_id);

    res.json({ message: "Password reset successful" });
  } catch (e) { next(e); }
};