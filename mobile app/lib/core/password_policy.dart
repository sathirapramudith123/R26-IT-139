// Same rules as backend/src/utils/passwordPolicy.js — keep the two in step.
final List<(bool Function(String), String)> _rules = [
  ((p) => p.length >= 12, "Use at least 12 characters."),
  ((p) => !RegExp(r'\s').hasMatch(p), "Do not use spaces."),
  ((p) => RegExp(r'[A-Z]').hasMatch(p), "Use at least one uppercase letter."),
  ((p) => RegExp(r'[a-z]').hasMatch(p), "Use at least one lowercase letter."),
  ((p) => RegExp(r'[0-9]').hasMatch(p), "Use at least one number."),
  ((p) => RegExp(r'[^A-Za-z0-9\s]').hasMatch(p), "Use at least one special character (e.g. ! @ # \$ %)."),
];

/// The checklist shown under a new-password field (PasswordGuidelines), in display order.
final List<(String, bool Function(String))> passwordGuidelines = [
  ("Use at least one number", (p) => RegExp(r'[0-9]').hasMatch(p)),
  ("Use at least one uppercase character", (p) => RegExp(r'[A-Z]').hasMatch(p)),
  ("Use at least one lowercase character", (p) => RegExp(r'[a-z]').hasMatch(p)),
  ("Use at least one special character", (p) => RegExp(r'[^A-Za-z0-9\s]').hasMatch(p)),
  ("Use a minimum of twelve characters", (p) => p.length >= 12),
  ("Do not use spaces", (p) => p.isNotEmpty && !RegExp(r'\s').hasMatch(p)),
];

/// English message (pass it through tr()) for the first rule [p] breaks, or null.
String? passwordProblem(String p) {
  for (final (ok, msg) in _rules) {
    if (!ok(p)) return msg;
  }
  return null;
}
