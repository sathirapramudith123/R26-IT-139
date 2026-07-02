import 'package:flutter/material.dart';
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
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Create Account")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(children: [
          if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(error!, style: TextStyle(color: Colors.red.shade700))),
          TextField(controller: fullName, decoration: const InputDecoration(labelText: "Full Name")),
          const SizedBox(height: 12),
          TextField(controller: email, decoration: const InputDecoration(labelText: "Email")),
          const SizedBox(height: 12),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: "Password (min 6)")),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: loading ? null : _register,
            child: Padding(padding: const EdgeInsets.all(12), child: Text(loading ? "Creating..." : "Create Account")),
          )),
        ]),
      ),
    );
  }
}