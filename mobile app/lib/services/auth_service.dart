import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api.dart';

class AuthService {
  // Encrypted storage (Android Keystore / iOS Keychain) so the user stays
  // logged in across app restarts.
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  /// Call once at startup (main.dart): puts a saved, still-valid token back into Api.
  static Future<void> restoreSession() async {
    try {
      final saved = await _storage.read(key: _tokenKey);
      if (saved == null) return;
      if (_isExpired(saved)) {
        await _storage.delete(key: _tokenKey);
      } else {
        Api.token = saved;
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
  }

  static Future<void> register(String fullName, String email, String password) async {
    await Api.post("/auth/register", {"fullName": fullName, "email": email, "password": password});
    await login(email, password); // backend register returns no token → log in
  }

  static Future<void> logout() async {
    Api.token = null;
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {}
  }

  static Map<String, dynamic>? get currentUser => Api.token == null ? null : _claims(Api.token!);

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
