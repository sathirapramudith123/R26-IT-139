import 'package:flutter/material.dart';
import '../core/theme.dart';

enum KadeButtonVariant { primary, secondary, danger, text }

/// A button that wraps the app's button themes (so styling stays consistent
/// with theme.dart) and adds the one thing Flutter's buttons don't have out
/// of the box: a built-in loading spinner state for form submissions.
///
/// ```dart
/// KadeButton(
///   label: "Save Transaction",
///   loading: isSaving,
///   onPressed: isSaving ? null : _submit,
/// )
/// ```
class KadeButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final KadeButtonVariant variant;
  final bool loading;
  final IconData? icon;
  final bool expand;

  const KadeButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = KadeButtonVariant.primary,
    this.loading = false,
    this.icon,
    this.expand = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = loading || onPressed == null;
    final child = _content(context);

    Widget button;
    switch (variant) {
      case KadeButtonVariant.primary:
        button = ElevatedButton(onPressed: isDisabled ? null : onPressed, child: child);
        break;
      case KadeButtonVariant.secondary:
        button = OutlinedButton(onPressed: isDisabled ? null : onPressed, child: child);
        break;
      case KadeButtonVariant.danger:
        final isDark = Theme.of(context).brightness == Brightness.dark;
        button = ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: isDark ? KadeColors.dangerDark : KadeColors.danger,
            foregroundColor: Colors.white,
          ),
          onPressed: isDisabled ? null : onPressed,
          child: child,
        );
        break;
      case KadeButtonVariant.text:
        button = TextButton(onPressed: isDisabled ? null : onPressed, child: child);
        break;
    }

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }

  Widget _content(BuildContext context) {
    if (loading) {
      final fg = variant == KadeButtonVariant.primary || variant == KadeButtonVariant.danger
          ? Colors.white
          : Theme.of(context).colorScheme.primary;
      return SizedBox(
        height: 18,
        width: 18,
        child: CircularProgressIndicator(strokeWidth: 2.2, color: fg),
      );
    }
    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: KadeSpacing.sm),
          Text(label),
        ],
      );
    }
    return Text(label);
  }
}