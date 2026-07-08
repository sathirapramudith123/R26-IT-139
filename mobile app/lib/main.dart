import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'screens/auth/login.dart';

void main() => runApp(const MyApp());

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
          themeMode: mode,          // switches with the toggle
          home: const LoginScreen(),
        );
      },
    );
  }
}