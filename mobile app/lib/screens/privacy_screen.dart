import 'package:flutter/material.dart';
import '../core/i18n.dart';
import '../core/theme.dart';

/// How Lanka-Link handles your data — every point describes what the app actually does.
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const _sections = [
    (
      Icons.storage_outlined,
      "Where your data is kept",
      [
        "Your sales, stock, suppliers and banking records are stored in a secure cloud database (Supabase / PostgreSQL).",
        "Every request is checked against your login, so you only ever see your own shop's data.",
      ],
    ),
    (
      Icons.lock_outline,
      "Login and passwords",
      [
        "Passwords are never stored as text — only a bcrypt hash that cannot be turned back into the password.",
        "A login lasts 8 hours; the login token is kept encrypted on this phone.",
        "Password-reset links work for 1 hour and only once. Repeated wrong logins are slowed down.",
      ],
    ),
    (
      Icons.account_balance_outlined,
      "Banking safety",
      [
        "CBSL daily limits for agent banking are always enforced — over-limit transactions are refused.",
        "Float and cash updates run as one database transaction, so two actions at the same moment cannot corrupt a balance.",
      ],
    ),
    (
      Icons.insights_outlined,
      "AI predictions",
      [
        "The AI models only receive figures worked out from your records (for example monthly sales or stock-out rate), and only through our own server.",
        "Every prediction shows the reasons behind it, so you can check it.",
      ],
    ),
    (
      Icons.place_outlined,
      "Location and maps",
      [
        "Your location is read only when you tap \"Use my location\" or a route map.",
        "Map searches and routes are sent to Google Maps to find places and distances.",
      ],
    ),
    (
      Icons.school_outlined,
      "Research project",
      [
        "Lanka-Link is a university research project (IT4010, R26-IT-139). Your data is not sold or used for advertising.",
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(tr("Privacy & Security"))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(tr("How your data is handled"), style: text.bodySmall),
          const SizedBox(height: 10),
          for (final (icon, title, points) in _sections)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 17,
                            backgroundColor: KadeColors.teal.withValues(alpha: 0.1),
                            child: Icon(icon, size: 18, color: KadeColors.teal),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(tr(title), style: text.titleSmall)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      for (final p in points)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Icon(Icons.check_circle, size: 15, color: KadeColors.success),
                              ),
                              const SizedBox(width: 8),
                              Expanded(child: Text(tr(p), style: text.bodyMedium)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
