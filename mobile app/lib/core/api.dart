import 'dart:convert';
import 'dart:io';
import 'config.dart';

class Api {
  static String? token; 

  static Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final client = HttpClient();
    try {
      final formattedPath = path.startsWith('/') ? path : '/$path';
      final formattedBase = AppConfig.baseUrl.endsWith('/') 
          ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1) 
          : AppConfig.baseUrl;

      final req = await client.openUrl(method, Uri.parse("$formattedBase$formattedPath"));
      req.headers.set("Content-Type", "application/json");
      if (token != null) req.headers.set("Authorization", "Bearer $token");
      if (body != null) req.add(utf8.encode(jsonEncode(body)));

      final res = await req.close();
      final text = await res.transform(utf8.decoder).join();
      final data = text.isNotEmpty ? jsonDecode(text) : null;

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