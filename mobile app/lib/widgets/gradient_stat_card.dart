import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// A colourful gradient "at a glance" metric card — used on the dashboard
/// for Total Income, Total Expense, Net Profit, Low Stock Items, etc.
/// Pass [onTap] to make the card navigate somewhere (an arrow icon appears
/// automatically when it does).
class GradientStatCard extends StatelessWidget {
  final String label;
  final String value;
  final List<Color> gradient;
  final VoidCallback? onTap;

  const GradientStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: gradient,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: gradient.first.withOpacity(0.35),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          // mainAxisSize.min so the column takes only what it needs; the label
          // row and the value are separated by a small fixed gap instead of
          // spaceBetween (which forced extra height and overflowed by ~6px).
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onTap != null)
                    const Padding(
                      padding: EdgeInsets.only(left: 6),
                      child: Icon(Icons.arrow_forward_ios, size: 12, color: Colors.white70),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              // FittedBox shrinks a very long value (e.g. "LKR 1,514,010")
              // to fit the card width instead of overflowing.
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  maxLines: 1,
                  style: GoogleFonts.nunito(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}