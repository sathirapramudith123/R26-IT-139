import 'package:flutter/material.dart';

// ---- Warm "Kade" palette ----
class KadeColors {
  // shared brand
  static const teal = Color(0xFF0D7566);
  static const tealDark = Color(0xFF2BB39C);
  static const amber = Color(0xFFE0912F);
  static const terra = Color(0xFFC65D3B);

  // light
  static const bgLight = Color(0xFFFAF6EF);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const borderLight = Color(0xFFECE3D5);
  static const textLight = Color(0xFF2B2320);
  static const textSoftLight = Color(0xFF6F635A);

  // dark
  static const bgDark = Color(0xFF1F1A17);
  static const surfaceDark = Color(0xFF2A2420);
  static const borderDark = Color(0xFF3D332C);
  static const textDark = Color(0xFFF3EBE2);
  static const textSoftDark = Color(0xFFB9AA9C);
}

ThemeData buildLightTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: KadeColors.bgLight,
    colorScheme: ColorScheme.fromSeed(
      seedColor: KadeColors.teal,
      primary: KadeColors.teal,
      surface: KadeColors.surfaceLight,
      brightness: Brightness.light,
    ),
    fontFamily: 'Nunito',
    cardTheme: CardThemeData(
      color: KadeColors.surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: KadeColors.borderLight),
      ),
    ),
    inputDecorationTheme: _inputTheme(KadeColors.surfaceLight, KadeColors.borderLight, KadeColors.teal),
    appBarTheme: const AppBarTheme(
      backgroundColor: KadeColors.bgLight,
      foregroundColor: KadeColors.textLight,
      elevation: 0,
    ),
  );
}

ThemeData buildDarkTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: KadeColors.bgDark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: KadeColors.tealDark,
      primary: KadeColors.tealDark,
      surface: KadeColors.surfaceDark,
      brightness: Brightness.dark,
    ),
    fontFamily: 'Nunito',
    cardTheme: CardThemeData(
      color: KadeColors.surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: KadeColors.borderDark),
      ),
    ),
    inputDecorationTheme: _inputTheme(KadeColors.surfaceDark, KadeColors.borderDark, KadeColors.tealDark),
    appBarTheme: const AppBarTheme(
      backgroundColor: KadeColors.bgDark,
      foregroundColor: KadeColors.textDark,
      elevation: 0,
    ),
  );
}

InputDecorationTheme _inputTheme(Color fill, Color border, Color focus) {
  return InputDecorationTheme(
    filled: true,
    fillColor: fill,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: focus, width: 2),
    ),
  );
}

// ---- Global theme toggle (no packages needed) ----
class ThemeController {
  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.light);

  static void toggle() {
    mode.value = mode.value == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
  }

  static bool get isDark => mode.value == ThemeMode.dark;
}