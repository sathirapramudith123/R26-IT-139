import 'package:flutter/material.dart';
import '../core/i18n.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import 'inventory/inventory_form_screen.dart' show fieldLabel, errorBox;

/// Change your name, and your password (the current password is checked by the backend).
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final nameCtrl = TextEditingController();
  final currentCtrl = TextEditingController();
  final newCtrl = TextEditingController();
  final confirmCtrl = TextEditingController();
  bool savingName = false, savingPassword = false;
  String? nameError, passwordError;

  @override
  void initState() {
    super.initState();
    nameCtrl.text = "${AuthService.currentUser?["full_name"] ?? ""}";
  }

  @override
  void dispose() {
    for (final c in [nameCtrl, currentCtrl, newCtrl, confirmCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  void _done(String msg) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(msg), backgroundColor: KadeColors.success));

  Future<void> _saveName() async {
    final name = nameCtrl.text.trim();
    if (name.length < 2) {
      setState(() => nameError = tr("Enter your full name."));
      return;
    }
    setState(() {
      savingName = true;
      nameError = null;
    });
    try {
      await AuthService.updateName(name);
      if (mounted) _done(tr("Name updated."));
    } catch (e) {
      setState(() => nameError = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => savingName = false);
    }
  }

  Future<void> _savePassword() async {
    FocusScope.of(context).unfocus();
    if (currentCtrl.text.isEmpty) {
      setState(() => passwordError = tr("Enter your current password."));
      return;
    }
    if (newCtrl.text.length < 6) {
      setState(() => passwordError = tr("At least 6 characters"));
      return;
    }
    if (newCtrl.text != confirmCtrl.text) {
      setState(() => passwordError = tr("The new passwords don't match."));
      return;
    }
    setState(() {
      savingPassword = true;
      passwordError = null;
    });
    try {
      await AuthService.changePassword(currentCtrl.text, newCtrl.text);
      for (final c in [currentCtrl, newCtrl, confirmCtrl]) {
        c.clear();
      }
      if (mounted) _done(tr("Password changed."));
    } catch (e) {
      setState(() => passwordError = tr(e.toString().replaceFirst("Exception: ", "")));
    } finally {
      if (mounted) setState(() => savingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    Widget section(String title, String sub, List<Widget> children) => Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: text.titleMedium),
            Text(sub, style: text.bodySmall),
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(tr("Edit Profile"))),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            section(tr("Your name"), tr("Shown on your profile and on your reports."), [
              if (nameError != null) errorBox(nameError!),
              fieldLabel(tr("Full Name")),
              TextField(
                controller: nameCtrl,
                enabled: !savingName,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(hintText: tr("Your full name")),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: savingName ? null : _saveName,
                child: Text(savingName ? tr("Saving...") : tr("Save")),
              ),
            ]),
            const SizedBox(height: 14),
            section(tr("Change password"), tr("You stay signed in on this phone."), [
              if (passwordError != null) errorBox(passwordError!),
              fieldLabel(tr("Current password")),
              TextField(controller: currentCtrl, obscureText: true, enabled: !savingPassword),
              const SizedBox(height: 12),
              fieldLabel(tr("New password")),
              TextField(
                controller: newCtrl,
                obscureText: true,
                enabled: !savingPassword,
                decoration: InputDecoration(hintText: tr("At least 6 characters")),
              ),
              const SizedBox(height: 12),
              fieldLabel(tr("Confirm new password")),
              TextField(controller: confirmCtrl, obscureText: true, enabled: !savingPassword),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: savingPassword ? null : _savePassword,
                child: Text(savingPassword ? tr("Saving...") : tr("Change password")),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
