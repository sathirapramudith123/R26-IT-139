import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../widgets/main_navigation.dart';
import 'register_screen.dart';
import '../../core/i18n.dart';

class LoginScreen extends StatefulWidget {
  /// true when the app sent the user here because their session expired
  final bool sessionExpired;
  const LoginScreen({super.key, this.sessionExpired = false});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> _login() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await AuthService.login(email.text.trim(), password.text);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainNavigation()));
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  icon: const Icon(Icons.translate, size: 18),
                  label: Text(LanguageController.isSinhala ? "English" : "සිංහල"),
                  onPressed: () async {
                    await LanguageController.set(LanguageController.isSinhala ? "en" : "si");
                    setState(() {});
                  },
                ),
              ),
              Image.asset("assets/icon/app_icon.png", width: 100, height: 100),
              Text(tr("Lanka-Link"), style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
              Text(tr("Sign in to your account"), style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 24),
              if (widget.sessionExpired && error == null)
                _errorBox(tr("Your session has expired. Please sign in again.")),
              if (error != null) _errorBox(tr(error!)),
              TextField(
                controller: email,
                decoration: InputDecoration(labelText: tr("Email")),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: password,
                obscureText: true,
                decoration: InputDecoration(labelText: tr("Password")),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: loading ? null : _login,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(loading ? tr("Signing in...") : tr("Sign In")),
                  ),
                ),
              ),
              TextButton(
                onPressed: () =>
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                child: Text(tr("New here? Create account")),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _errorBox(String msg) => Container(
  width: double.infinity,
  padding: const EdgeInsets.all(12),
  margin: const EdgeInsets.only(bottom: 12),
  decoration: BoxDecoration(
    color: Colors.red.shade50,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Colors.red.shade200),
  ),
  child: Text(tr(msg), style: TextStyle(color: Colors.red.shade700)),
);
