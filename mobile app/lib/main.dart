import 'package:flutter/material.dart';
import 'core/api.dart';
import 'core/theme.dart';
import 'services/auth_service.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'widgets/main_navigation.dart';
import 'core/i18n.dart';

/// Lets non-widget code (the Api 401 handler) navigate.
final navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // A screen that fails to build shows this card (and the error still goes to the console)
  // instead of Flutter's red / grey error screen.
  ErrorWidget.builder = (details) => _BuildErrorCard(message: details.exceptionAsString());
  await AuthService.restoreSession(); // stay logged in across app restarts
  await LanguageController.load(); // Sinhala / English choice saved on this phone
  Api.onUnauthorized = _goToLogin; // expired token → back to login
  runApp(const MyApp());
}

bool _redirecting = false; // several requests can 401 at once — navigate only once

void _goToLogin() {
  if (_redirecting) return;
  _redirecting = true;
  AuthService.logout();
  navigatorKey.currentState?.pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen(sessionExpired: true)),
    (_) => false,
  );
  Future.delayed(const Duration(seconds: 2), () => _redirecting = false);
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) {
        return MaterialApp(
          title: tr('Kade'),
          navigatorKey: navigatorKey,
          debugShowCheckedModeBanner: false,
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          themeMode: mode,
          // App opens on the animated splash, then goes straight to the app
          // if a valid session was restored, otherwise to Login.
          home: SplashScreen(
            duration: const Duration(seconds: 4),
            next: () => AuthService.isLoggedIn ? const MainNavigation() : const LoginScreen(),
          ),
        );
      },
    );
  }
}

class _BuildErrorCard extends StatelessWidget {
  final String message;
  const _BuildErrorCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFFFDECEC), borderRadius: BorderRadius.circular(14)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Color(0xFFC62828)),
              const SizedBox(height: 8),
              Text(
                tr("This part of the screen could not be shown."),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFC62828), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                message,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF5B6478), fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
