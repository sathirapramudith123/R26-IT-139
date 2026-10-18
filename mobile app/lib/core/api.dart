import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'config.dart';

class Api {
  static String? token;

  // Without limits an unreachable server (other Wi-Fi, changed computer IP) froze the screen for
  // minutes. Predictions can take a while when the ML service is waking up, so the reply limit is
  // generous.
  static const connectTimeout = Duration(seconds: 10);
  static const replyTimeout = Duration(seconds: 45);
  static const offlineMessage =
      "Cannot reach the server. Check your internet / Wi-Fi and that the backend is running.";

  /// Set in main.dart — called when the server rejects our token (401).
  static void Function()? onUnauthorized;

  static Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final client = HttpClient()..connectionTimeout = connectTimeout;
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

      final res = await req.close().timeout(replyTimeout);
      final text = await res.transform(utf8.decoder).join().timeout(replyTimeout);
      dynamic data;
      try {
        data = text.isNotEmpty ? jsonDecode(text) : null;
      } on FormatException {
        // e.g. an HTML error page from a proxy — not our API's JSON
        if (res.statusCode >= 400) throw Exception("Request failed (${res.statusCode})");
        throw Exception("Unexpected reply from the server.");
      }

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
    } on SocketException {
      throw Exception(offlineMessage);
    } on TimeoutException {
      throw Exception(offlineMessage);
    } on HandshakeException {
      throw Exception(offlineMessage);
    } finally {
      client.close(force: true);
    }
  }

  static Future<dynamic> get(String path) => _send("GET", path);
  static Future<dynamic> post(String path, Map<String, dynamic> body) => _send("POST", path, body);
  static Future<dynamic> put(String path, Map<String, dynamic> body) => _send("PUT", path, body);
  static Future<dynamic> delete(String path) => _send("DELETE", path);
}
