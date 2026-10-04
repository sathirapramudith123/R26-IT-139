import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';

/// Shared look for "view one record" screens: a blue header (title, status, big figure,
/// up to three facts) followed by cards. Used by every module's details screen.
class RecordDetailsScreen extends StatelessWidget {
  final String appBarTitle;
  final String heading;
  final String? subheading;
  final String? figure; // big number in the header, e.g. "LKR 749.76"
  final String? figureCaption;
  final (String, Color)? status;
  final List<(String, String)> facts;
  final List<Widget> sections;

  const RecordDetailsScreen({
    super.key,
    required this.appBarTitle,
    required this.heading,
    this.subheading,
    this.figure,
    this.figureCaption,
    this.status,
    this.facts = const [],
    this.sections = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(appBarTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: KadeColors.headerGradient),
              borderRadius: BorderRadius.circular(KadeRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            heading,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (subheading != null && subheading!.isNotEmpty)
                            Text(subheading!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        ],
                      ),
                    ),
                    if (status != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          status!.$1,
                          style: TextStyle(color: status!.$2, fontWeight: FontWeight.w700, fontSize: 12),
                        ),
                      ),
                  ],
                ),
                if (figure != null) ...[
                  const SizedBox(height: 6),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      figure!,
                      style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700),
                    ),
                  ),
                  if (figureCaption != null)
                    Text(figureCaption!, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ],
                if (facts.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final (label, value) in facts)
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(
                                value,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          for (final s in sections) ...[const SizedBox(height: 12), s],
        ],
      ),
    );
  }
}

/// A white card with an icon + title, used for each section of a details screen
class DetailCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;
  const DetailCard({super.key, required this.title, required this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: teal),
                const SizedBox(width: 8),
                Expanded(child: Text(title, style: Theme.of(context).textTheme.titleSmall)),
              ],
            ),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Label on the left, value on the right (skipped by callers when the value is empty)
class DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const DetailRow(this.label, this.value, {super.key, this.color});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 130, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: color),
          ),
        ),
      ],
    ),
  );
}

/// One line of an item list: name + detail on the left, amount on the right
class DetailLine extends StatelessWidget {
  final String title;
  final String detail;
  final String? trailing;
  const DetailLine({super.key, required this.title, required this.detail, this.trailing});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: text.titleSmall),
                if (detail.isNotEmpty) Text(detail, style: text.bodySmall),
              ],
            ),
          ),
          if (trailing != null) Text(trailing!, style: text.titleSmall),
        ],
      ),
    );
  }
}

/* ---------------- formatting shared by the details screens ---------------- */

double numOf(dynamic v) => v is num ? v.toDouble() : double.tryParse("${v ?? ""}") ?? 0;

String money(dynamic v) {
  final n = numOf(v);
  final parts = n.abs().toStringAsFixed(2).split(".");
  final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ",");
  return "${n < 0 ? "-" : ""}LKR $whole.${parts[1]}";
}

String qtyOf(dynamic v) {
  final n = numOf(v);
  return n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
}

String dateOf(dynamic v, {bool time = false}) {
  final d = DateTime.tryParse("${v ?? ""}");
  if (d == null) return "—";
  final l = d.toLocal();
  final day = "${l.year}-${l.month.toString().padLeft(2, "0")}-${l.day.toString().padLeft(2, "0")}";
  if (!time) return day;
  return "$day ${l.hour.toString().padLeft(2, "0")}:${l.minute.toString().padLeft(2, "0")}";
}

/// "cash_deposit" → "Cash Deposit" (then translated)
String words(dynamic v) => tr(
  "${v ?? ""}"
      .replaceAll("_", " ")
      .toLowerCase()
      .split(" ")
      .where((w) => w.isNotEmpty)
      .map((w) => w[0].toUpperCase() + w.substring(1))
      .join(" "),
);

bool hasText(dynamic v) => v != null && "$v".trim().isNotEmpty;
