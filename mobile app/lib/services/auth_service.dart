import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api.dart';

class AuthService {
  // Encrypted storage (Android Keystore / iOS Keychain) so the user stays
  // logged in across app restarts.
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  /// Signed-in user's details from GET /auth/me (the token only carries id + email)
  static Map<String, dynamic>? profile;

  /// Call once at startup (main.dart): puts a saved, still-valid token back into Api.
  static Future<void> restoreSession() async {
    try {
      final saved = await _storage.read(key: _tokenKey);
      if (saved == null) return;
      if (_isExpired(saved)) {
        await _storage.delete(key: _tokenKey);
      } else {
        Api.token = saved;
        await loadProfile();
      }
    } catch (_) {
      Api.token = null; // storage unavailable → just start logged out
    }
  }

  static bool get isLoggedIn => Api.token != null && !_isExpired(Api.token!);

  static Future<void> login(String email, String password) async {
    final res = await Api.post("/auth/login", {"email": email, "password": password});
    final token = res["token"] as String;
    Api.token = token;
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (_) {
      // Could not persist — the session still works until the app is closed.
    }
    await loadProfile();
  }

  /// Fetch name / user code from the backend; keeps the old value if offline.
  static Future<Map<String, dynamic>?> loadProfile() async {
    try {
      final me = await Api.get("/auth/me");
      if (me is Map<String, dynamic>) profile = me;
    } catch (_) {}
    return profile;
  }

  static Future<void> updateName(String fullName) async {
    final me = await Api.put("/auth/me", {"full_name": fullName});
    if (me is Map<String, dynamic>) profile = me;
  }

  /// Other devices are signed out by the backend; this one continues with the new token.
  static Future<void> changePassword(String current, String next) async {
    final res = await Api.post("/auth/change-password", {"current_password": current, "new_password": next});
    final token = res is Map ? res["token"] : null;
    if (token is String) {
      Api.token = token;
      try {
        await _storage.write(key: _tokenKey, value: token);
      } catch (_) {}
    }
  }

  /// Ends every session of this account (all phones and browsers), then this one.
  static Future<void> logoutAll() async {
    await Api.post("/auth/logout-all", {});
    await logout();
  }

  static Future<void> register(String fullName, String email, String password) async {
    await Api.post("/auth/register", {"fullName": fullName, "email": email, "password": password});
    await login(email, password); // backend register returns no token → log in
  }

  static Future<void> logout() async {
    Api.token = null;
    profile = null;
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {}
  }

  /// Token claims (id, email) plus the profile (full_name, user_code) once loaded
  static Map<String, dynamic>? get currentUser =>
      Api.token == null ? null : {...?_claims(Api.token!), ...?profile};

  static Map<String, dynamic>? _claims(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final normalized = base64Url.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      return jsonDecode(decoded) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // JWT "exp" is in seconds. 30 s margin so a request doesn't start with a dying token.
  static bool _isExpired(String token) {
    final exp = _claims(token)?['exp'];
    if (exp is! num) return false; // no exp claim → let the server decide
    return DateTime.now().millisecondsSinceEpoch ~/ 1000 >= exp - 30;
  }
}
