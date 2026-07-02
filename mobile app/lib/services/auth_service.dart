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
}