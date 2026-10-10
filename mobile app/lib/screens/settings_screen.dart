import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import 'auth/login_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';
import 'privacy_screen.dart';
import '../widgets/main_navigation.dart';
import '../core/i18n.dart';

/// App-wide settings hub — theme, notifications, account, and app info.
/// This is where the "manage the app" controls live, reached from the
/// bottom navigation bar (replacing the old standalone Alerts tab).
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tr('Settings'))),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          _SectionLabel(tr('Account')),
          _SettingsTile(
            icon: Icons.person_outline,
            title: tr('Profile'),
            subtitle: tr('View and edit your account details'),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
          ),

          const SizedBox(height: 8),
          _SectionLabel(tr('Preferences')),
          _SettingsTile(
            icon: Icons.notifications_outlined,
            title: tr('Notifications'),
            subtitle: tr('View alerts and manage notification history'),
            onTap: () =>
                Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          ),
          ValueListenableBuilder<ThemeMode>(
            valueListenable: ThemeController.mode,
            builder: (context, mode, _) => SwitchListTile(
              secondary: const Icon(Icons.dark_mode_outlined),
              title: Text(tr('Dark Mode')),
              subtitle: Text(tr('Switch between light and dark theme')),
              value: mode == ThemeMode.dark,
              onChanged: (_) => ThemeController.toggle(),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.translate),
            title: Text(tr('Language')),
            subtitle: Text(LanguageController.isSinhala ? 'සිංහල' : 'English'),
            trailing: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'si', label: Text('සිං')),
                ButtonSegment(value: 'en', label: Text('EN')),
              ],
              selected: {LanguageController.lang.value},
              showSelectedIcon: false,
              onSelectionChanged: (s) async {
                await LanguageController.set(s.first);
                if (!context.mounted) return;
                // rebuild every screen in the new language
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const MainNavigation(initialIndex: 3)),
                  (route) => false,
                );
              },
            ),
          ),

          const SizedBox(height: 8),
          _SectionLabel(tr('About')),
          _SettingsTile(icon: Icons.info_outline, title: tr('App Version'), subtitle: '1.0.0'),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: tr('Privacy & Security'),
            subtitle: tr('How your data is handled'),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())),
          ),

          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.logout),
              label: Text(tr('Log Out')),
              onPressed: () async {
                await AuthService.logout();
                if (!context.mounted) return;
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
      child: Text(
        tr(label),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: Theme.of(context).textTheme.bodySmall?.color,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  const _SettingsTile({required this.icon, required this.title, this.subtitle, this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(tr(title), style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: subtitle != null ? Text(tr(subtitle!)) : null,
      trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
      onTap: onTap,
    );
  }
}
