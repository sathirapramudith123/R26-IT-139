import 'dart:convert';
import 'dart:io';
import 'config.dart';

class Api {
  static String? token;

  /// Set in main.dart — called when the server rejects our token (401).
  static void Function()? onUnauthorized;

  static Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final client = HttpClient();
    try {
      final formattedPath = path.startsWith('/') ? path : '/$path';
      final formattedBase = AppConfig.baseUrl.endsWith('/')
          ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1)
          : AppConfig.baseUrl;

      final req = await client.openUrl(method, Uri.parse("$formattedBase$formattedPath"));
      req.headers.set("Content-Type", "application/json");
      final sentToken = token;
      if (sentToken != null) req.headers.set("Authorization", "Bearer $sentToken");
      if (body != null) req.add(utf8.encode(jsonEncode(body)));

      final res = await req.close();
      final text = await res.transform(utf8.decoder).join();
      final data = text.isNotEmpty ? jsonDecode(text) : null;

      // Session expired / invalid token → send the user to login.
      // Not for /auth/* (a wrong password on login is also a 401, but not a "session").
      if (res.statusCode == 401 && sentToken != null && !formattedPath.startsWith('/auth/')) {
        onUnauthorized?.call();
        throw Exception("Your session has expired. Please sign in again.");
      }

      if (res.statusCode >= 400) {
        var msg = (data is Map) ? (data["error"] ?? data["message"] ?? "Request failed") : "Request failed";
        if (msg is List) msg = msg.join(", ");
        throw Exception(msg.toString());
      }
      return data;
    } finally {
      client.close();
    }
  }

  static Future<dynamic> get(String path) => _send("GET", path);
  static Future<dynamic> post(String path, Map<String, dynamic> body) => _send("POST", path, body);
  static Future<dynamic> put(String path, Map<String, dynamic> body) => _send("PUT", path, body);
  static Future<dynamic> delete(String path) => _send("DELETE", path);
}
