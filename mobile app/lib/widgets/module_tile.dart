import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/i18n.dart';

/// A square-ish tile in the dashboard's module grid (Transactions,
/// Inventory, Predictions, etc). Set [highlight] for a tinted "featured"
/// look (used for Predictions on the dashboard).
class ModuleTile extends StatelessWidget {
  final IconData icon;
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
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: highlight
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: KadeColors.headerGradient,
                  )
                : null,
            color: highlight ? null : Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(KadeRadius.lg),
            boxShadow: isDark
                ? null
                : const [BoxShadow(color: KadeColors.cardShadow, blurRadius: 16, offset: Offset(0, 6))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 40,
                width: 40,
                decoration: BoxDecoration(
                  color: highlight ? Colors.white.withValues(alpha: 0.2) : teal.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 20, color: highlight ? Colors.white : teal),
              ),
              const Spacer(),
              Text(
                tr(title),
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(color: highlight ? Colors.white : null),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
