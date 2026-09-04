import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';

/// A square-ish tile in the dashboard's module grid (Transactions,
/// Inventory, Predictions, etc). Set [highlight] for a tinted "featured"
/// look (used for Predictions on the dashboard).
class ModuleTile extends StatelessWidget {
  final String icon;
  final String title;
  final VoidCallback onTap;
  final bool highlight;

  const ModuleTile({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: highlight ? teal.withOpacity(isDark ? 0.22 : 0.10) : Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 44,
                width: 44,
                decoration: BoxDecoration(
                  color: highlight ? teal.withOpacity(0.18) : (isDark ? Colors.white10 : const Color(0xFFF3ECE0)),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(child: Text(icon, style: const TextStyle(fontSize: 22))),
              ),
              const Spacer(),
              Text(
                title,
                style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}