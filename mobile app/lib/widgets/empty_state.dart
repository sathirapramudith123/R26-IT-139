import 'package:flutter/material.dart';

class EmptyState extends StatelessWidget {
  final String icon, title, description;
  const EmptyState({super.key, this.icon = "📭", required this.title, this.description = ""});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(icon, style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(description, style: const TextStyle(color: Colors.grey), textAlign: TextAlign.center),
          ],
        ]),
      );
}