import 'package:flutter/material.dart';
import '../core/i18n.dart';
import '../core/password_policy.dart';
import '../core/theme.dart';

/// Live checklist of the password rules: each one turns green once [password] meets it.
class PasswordGuidelines extends StatelessWidget {
  final String password;
  const PasswordGuidelines({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final green = isDark ? KadeColors.successDark : KadeColors.success;
    final grey = isDark ? KadeColors.textSoftDark : KadeColors.textSoftLight;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(tr("Password guidelines:"), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        const SizedBox(height: 6),
        for (final (label, ok) in passwordGuidelines)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                SizedBox(
                  width: 18,
                  child: ok(password)
                      ? Icon(Icons.check, size: 15, color: green)
                      : Center(
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: grey.withValues(alpha: 0.6),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    tr(label),
                    style: TextStyle(fontSize: 12.5, color: ok(password) ? green : grey),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
