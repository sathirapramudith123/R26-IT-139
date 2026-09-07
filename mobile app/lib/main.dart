import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/theme.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Loads .env at the project root into dotenv.env — used by
  // location_picker_map.dart / supplier_distance_map.dart for the
  // Google Maps Places & Directions API key. Must finish before runApp,
  // since those widgets read dotenv.env the moment they build.
  await dotenv.load(fileName: ".env");
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) {
        return MaterialApp(
          title: 'Kade',
          debugShowCheckedModeBanner: false,
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          themeMode: mode,
          // App opens on the animated splash, which then routes to Login.
          home: SplashScreen(
            duration: const Duration(seconds: 4),
            next: () => const LoginScreen()),
        );
      },
    );
  }
}