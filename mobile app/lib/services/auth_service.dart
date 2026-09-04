import 'dart:convert';
import '../core/api.dart';

class AuthService {
  static Future<void> login(String email, String password) async {
    final res = await Api.post("/auth/login", {"email": email, "password": password});
    Api.token = res["token"];
  }

  static Future<void> register(String fullName, String email, String password) async {
    await Api.post("/auth/register", {"fullName": fullName, "email": email, "password": password});
    await login(email, password); // backend register returns no token → log in
  }

  static void logout() => Api.token = null;

  static Map<String, dynamic>? get currentUser {
    final token = Api.token;
    if (token == null) return null;
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
}