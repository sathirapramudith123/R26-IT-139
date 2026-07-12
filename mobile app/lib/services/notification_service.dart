import '../core/api.dart';

class NotificationService {
  static Future<List<Map<String, dynamic>>> list() async {
    final data = await Api.get("/notifications");
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  static Future<int> unreadCount() async {
    final data = await Api.get("/notifications/unread-count");
    if (data is Map && data["count"] is num) return (data["count"] as num).toInt();
    return 0;
  }

  static Future<void> markRead(String id) => Api.put("/notifications/$id/read", {});
  static Future<void> markAllRead() => Api.put("/notifications/read-all", {});
}