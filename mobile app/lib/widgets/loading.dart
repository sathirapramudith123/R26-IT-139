import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Standard loading indicator used across screens while data is fetched.
class Loading extends StatelessWidget {
  final String label;
  const Loading({super.key, this.label = "Loading..."});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: KadeSpacing.md),
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: isDark ? KadeColors.textSoftDark : KadeColors.textSoftLight,
            ),
          ),
        ],
      ),
    );
  }
}