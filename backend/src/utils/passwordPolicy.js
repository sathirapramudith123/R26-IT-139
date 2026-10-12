// Password rules for new passwords (register, reset, change). Login does not check them,
// so accounts created under the old 6-character rule can still sign in.
export const PASSWORD_RULES = [
  [(p) => p.length >= 12, "Use at least 12 characters."],
  [(p) => !/\s/.test(p), "Do not use spaces."],
  [(p) => /[A-Z]/.test(p), "Use at least one uppercase letter."],
  [(p) => /[a-z]/.test(p), "Use at least one lowercase letter."],
  [(p) => /[0-9]/.test(p), "Use at least one number."],
  [(p) => /[^A-Za-z0-9\s]/.test(p), "Use at least one special character (e.g. ! @ # $ %)."],
];

/** The first rule a password breaks, or null when it is strong enough. */
export const passwordProblem = (p) => PASSWORD_RULES.find(([ok]) => !ok(String(p ?? "")))?.[1] ?? null;
