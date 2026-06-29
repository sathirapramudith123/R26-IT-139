import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { supabase } from "../config/supabase.js";

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    const { data: existing } = await supabase
      .from("users").select("id").eq("email", email).maybeSingle();
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("users")
      .insert({ full_name: fullName, email, password: hash })
      .select("id, full_name, email").single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data: user } = await supabase
      .from("users").select("*").eq("email", email).maybeSingle();
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email } });
  } catch (e) { next(e); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { data: user } = await supabase
      .from("users").select("id").eq("email", email).maybeSingle();

    if (!user) return res.json({ message: "If that email exists, a reset link was sent." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from("users")
      .update({ reset_token: token, reset_token_expiry: expiry })
      .eq("id", user.id);

    res.json({
      message: "Password reset token generated.",
      resetToken: token,
    });
  } catch (e) { next(e); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const { data: user } = await supabase
      .from("users").select("*").eq("reset_token", token).maybeSingle();

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });
    if (new Date(user.reset_token_expiry) < new Date())
      return res.status(400).json({ error: "Token has expired" });

    const hash = await bcrypt.hash(newPassword, 10);
    await supabase.from("users")
      .update({ password: hash, reset_token: null, reset_token_expiry: null })
      .eq("id", user.id);

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (e) { next(e); }
};