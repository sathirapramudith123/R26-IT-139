import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import 'auth/login_screen.dart';

/// User profile tab. Wire the TODOs below to your real user/session data
/// (e.g. whatever AuthService exposes for the logged-in user) once you
/// know the exact field names your backend returns.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String name = "";
  String email = "";
  String role = "";

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  void _loadUser() {
    // The JWT payload's field names depend on what your backend/Supabase
    // puts in the token. We try a few common variants for each field so
    // this keeps working even if the exact key differs.
    final claims = AuthService.currentUser;
    setState(() {
      name = _firstNonEmpty(claims, ['fullName', 'full_name', 'name']) ?? "Merchant";
      email = _firstNonEmpty(claims, ['email']) ?? "—";
      role = _firstNonEmpty(claims, ['role', 'user_role']) ?? "Merchant";
    });
  }

  String? _firstNonEmpty(Map<String, dynamic>? map, List<String> keys) {
    if (map == null) return null;
    for (final k in keys) {
      final v = map[k];
      if (v is String && v.isNotEmpty) return v;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(0),
          children: [
            // ---- Header ----
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [teal, const Color(0xFF094F45)],
                ),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(36),
                  bottomRight: Radius.circular(36),
                ),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 42,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : "?",
                      style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                  const SizedBox(height: 4),
                  Text(email, style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(role, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // ---- Account details ----
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
              child: Text("Account Details", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Theme.of(context).textTheme.bodySmall?.color)),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text("Name"),
              subtitle: Text(name),
            ),
            ListTile(
              leading: const Icon(Icons.email_outlined),
              title: const Text("Email"),
              subtitle: Text(email),
            ),
            ListTile(
              leading: const Icon(Icons.badge_outlined),
              title: const Text("Role"),
              subtitle: Text(role),
            ),

            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.edit_outlined),
                label: const Text("Edit Profile"),
                onPressed: () {
                  // TODO: navigate to an edit-profile form once you have one.
                },
              ),
            ),
            const SizedBox(height: 12),
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
                label: const Text("Log Out"),
                onPressed: () {
                  AuthService.logout();
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                },
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}