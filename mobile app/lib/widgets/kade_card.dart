import 'package:flutter/material.dart';
import '../core/theme.dart';

/// A generic content surface — the plain white/dark card used for form
/// sections, list rows, and grouped content across the app. Wraps the
/// theme's CardTheme so it's always consistent with light/dark mode.
///
/// Use this for ordinary content blocks. For the colorful dashboard stat
/// tiles, use [GradientStatCard] instead; for the icon+title grid tiles, use
/// [ModuleTile].
class KadeCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;

  const KadeCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(KadeSpacing.md),
    this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final cardTheme = Theme.of(context).cardTheme;
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? cardTheme.color,
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        border: (cardTheme.shape is RoundedRectangleBorder)
            ? (cardTheme.shape as RoundedRectangleBorder).side.style == BorderStyle.none
                ? null
                : Border.all(color: (cardTheme.shape as RoundedRectangleBorder).side.color)
            : null,
      ),
      child: child,
    );

    if (onTap == null) return content;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        child: content,
      ),
    );
  }
}