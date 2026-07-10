import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../dashboard_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final fullName = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  bool obscure = true;
  String? error;

  Future<void> _register() async {
    setState(() { loading = true; error = null; });
    try {
      await AuthService.register(fullName.text.trim(), email.text.trim(), password.text);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 56),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [teal, const Color(0xFF094F45)],
                  ),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(40), bottomRight: Radius.circular(40),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      ValueListenableBuilder<ThemeMode>(
                        valueListenable: ThemeController.mode,
                        builder: (context, mode, _) => IconButton(
                          icon: Icon(mode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode, color: Colors.white),
                          onPressed: () => ThemeController.toggle(),
                        ),
                      ),
                    ]),
                    const SizedBox(height: 12),
                    const Text("Create account",
                        style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                    const SizedBox(height: 6),
                    Text("Join Lanka-Link and manage your kade.",
                        style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 15)),
                  ],
                ),
              ),

              Transform.translate(
                offset: const Offset(0, -28),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(isDark ? 0.3 : 0.06), blurRadius: 24, offset: const Offset(0, 12))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (error != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: KadeColors.terra.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                          child: Row(children: [
                            const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
                            const SizedBox(width: 8),
                            Expanded(child: Text(error!, style: const TextStyle(color: KadeColors.terra, fontSize: 13))),
                          ]),
                        ),

                      const Text("Full Name", style: TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
                      const SizedBox(height: 6),
                      TextField(controller: fullName, decoration: const InputDecoration(hintText: "Nimal Perera", prefixIcon: Icon(Icons.person_outline))),
                      const SizedBox(height: 16),

                      const Text("Email", style: TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
                      const SizedBox(height: 6),
                      TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: "name@example.com", prefixIcon: Icon(Icons.mail_outline))),
                      const SizedBox(height: 16),

                      const Text("Password", style: TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
                      const SizedBox(height: 6),
                      TextField(
                        controller: password,
                        obscureText: obscure,
                        decoration: InputDecoration(
                          hintText: "At least 6 characters",
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(obscure ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => obscure = !obscure),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      SizedBox(
                        height: 52,
                        child: FilledButton(
                          style: FilledButton.styleFrom(backgroundColor: teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
                          onPressed: loading ? null : _register,
                          child: loading
                              ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                              : const Text("Create Account", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Have an account? ", style: TextStyle(color: Theme.of(context).textTheme.bodyMedium?.color)),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Text("Sign in", style: TextStyle(color: teal, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}