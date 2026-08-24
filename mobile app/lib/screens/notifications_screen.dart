import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> items = [];
  bool loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    try { items = await NotificationService.list(); }
    catch (_) { items = []; }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> _readAll() async {
    await NotificationService.markAllRead();
    _load();
  }

  IconData _icon(String t) {
    if (t == "warning") return Icons.warning_amber_rounded;
    if (t == "success") return Icons.check_circle_outline;
    if (t == "alert")   return Icons.error_outline;
    return Icons.info_outline;
  }

  Color _color(String t) {
    if (t == "warning") return KadeColors.amber;
    if (t == "success") return KadeColors.teal;
    if (t == "alert")   return KadeColors.terra;
    return Colors.blueGrey;
  }

  String _ago(String? iso) {
    final d = DateTime.tryParse(iso ?? "");
    if (d == null) return "";
    final s = DateTime.now().difference(d);
    if (s.inMinutes < 1) return "just now";
    if (s.inHours < 1) return "${s.inMinutes}m ago";
    if (s.inDays < 1) return "${s.inHours}h ago";
    return "${s.inDays}d ago";
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Notifications"),
        actions: [TextButton(onPressed: _readAll, child: const Text("Mark all read"))],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : items.isEmpty
              ? const Center(child: Text("No notifications yet"))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (_, i) {
                      final n = items[i];
                      final type = "${n["notification_type"] ?? "info"}";
                      final unread = n["is_read"] != true;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: unread ? _color(type).withOpacity(0.08) : Theme.of(context).cardTheme.color,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
                        ),
                        child: ListTile(
                          leading: Icon(_icon(type), color: _color(type)),
                          title: Text("${n["title"]}",
                              style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("${n["message"]}"),
                              const SizedBox(height: 4),
                              Text(_ago(n["created_at"]),
                                  style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color)),
                            ],
                          ),
                          trailing: unread
                              ? Container(height: 8, width: 8,
                                  decoration: BoxDecoration(color: _color(type), shape: BoxShape.circle))
                              : null,
                          onTap: () async {
                            if (unread) {
                              await NotificationService.markRead("${n["id"]}");
                              _load();
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}