import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';

/// "Forgot password?": asks the backend to email a reset link (POST /auth/forgot-password).
/// The link opens the web app's reset page, where the new password is chosen.
class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;
  const ForgotPasswordScreen({super.key, this.initialEmail = ""});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late final email = TextEditingController(text: widget.initialEmail);
  bool loading = false;
  bool sent = false;
  String? error;

  @override
  void dispose() {
    email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    FocusScope.of(context).unfocus();
    final e = email.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(e)) {
      setState(() => error = tr("Enter a valid email address."));
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await Api.post("/auth/forgot-password", {"email": e});
      if (mounted) setState(() => sent = true);
    } catch (ex) {
      if (mounted) setState(() => error = ex.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    return Scaffold(
      appBar: AppBar(title: Text(tr("Forgot password?"))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Icon(Icons.key_outlined, size: 48, color: KadeColors.teal),
            const SizedBox(height: 12),
            Text(
              tr("No worries, we'll send you reset instructions."),
              textAlign: TextAlign.center,
              style: TextStyle(color: sub),
            ),
            const SizedBox(height: 24),
            if (sent) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: KadeColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr("Check your email"),
                      style: const TextStyle(fontWeight: FontWeight.w700, color: KadeColors.success),
                    ),
                    const SizedBox(height: 6),
                    Text(tr("If that email exists, a reset link has been sent")),
                    const SizedBox(height: 6),
                    Text(
                      tr("The link works for 1 hour. Open it and choose a new password, then sign in here."),
                      style: TextStyle(fontSize: 12, color: sub),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => Navigator.pop(context), child: Text(tr("Back to Sign In"))),
              TextButton(
                onPressed: loading ? null : () => setState(() => sent = false),
                child: Text(tr("Send again")),
              ),
            ] else ...[
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(tr(error!), style: const TextStyle(color: KadeColors.danger)),
                ),
              TextField(
                controller: email,
                enabled: !loading,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: InputDecoration(
                  labelText: tr("Email"),
                  prefixIcon: const Icon(Icons.mail_outline),
                ),
                onSubmitted: (_) => _send(),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 50,
                child: FilledButton(
                  onPressed: loading ? null : _send,
                  child: loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(tr("Send reset link")),
                ),
              ),
              TextButton(onPressed: () => Navigator.pop(context), child: Text(tr("Back to Sign In"))),
            ],
          ],
        ),
      ),
    );
  }
}
