// Same rules as backend/src/utils/passwordPolicy.js — keep the two in step.
const RULES = [
  [(p) => p.length >= 12, "Use at least 12 characters."],
  [(p) => !/\s/.test(p), "Do not use spaces."],
  [(p) => /[A-Z]/.test(p), "Use at least one uppercase letter."],
  [(p) => /[a-z]/.test(p), "Use at least one lowercase letter."],
  [(p) => /[0-9]/.test(p), "Use at least one number."],
  [(p) => /[^A-Za-z0-9\s]/.test(p), "Use at least one special character (e.g. ! @ # $ %)."],
];

// The checklist shown under a new-password field (PasswordGuidelines), in display order
export const PASSWORD_GUIDELINES = [
  { label: "Use at least one number", ok: (p) => /[0-9]/.test(p) },
  { label: "Use at least one uppercase character", ok: (p) => /[A-Z]/.test(p) },
  { label: "Use at least one lowercase character", ok: (p) => /[a-z]/.test(p) },
  { label: "Use at least one special character", ok: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { label: "Use a minimum of twelve characters", ok: (p) => p.length >= 12 },
  { label: "Do not use spaces", ok: (p) => p.length > 0 && !/\s/.test(p) },
];

/** English message for the first rule the password breaks (pass it through t()), or null. */
export const passwordProblem = (p) => RULES.find(([ok]) => !ok(String(p ?? "")))?.[1] ?? null;
