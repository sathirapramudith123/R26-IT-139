import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ---- Warm "Kade" palette ----
class KadeColors {
  // shared brand
  static const teal = Color(0xFF0D7566);
  static const tealDark = Color(0xFF2BB39C);
  static const amber = Color(0xFFE0912F);
  static const terra = Color(0xFFC65D3B);

  // semantic (used across both themes for status/state)
  static const success = Color(0xFF3F9142);
  static const successDark = Color(0xFF6BC96E);
  static const danger = terra;        // reuse terra as the "error" accent
  static const dangerDark = Color(0xFFE0836A);
  static const warning = amber;       // reuse amber as the "warning" accent
  static const warningDark = Color(0xFFF0AC5C);
  static const info = teal;
  static const infoDark = tealDark;

  // light
  static const bgLight = Color(0xFFFAF6EF);
  static const surfaceLight = Color(0xFFFFFFFF);
  static const surfaceMutedLight = Color(0xFFF3EDE1);
  static const borderLight = Color(0xFFECE3D5);
  static const textLight = Color(0xFF2B2320);
  static const textSoftLight = Color(0xFF6F635A);

  // dark
  static const bgDark = Color(0xFF1F1A17);
  static const surfaceDark = Color(0xFF2A2420);
  static const surfaceMutedDark = Color(0xFF332C26);
  static const borderDark = Color(0xFF3D332C);
  static const textDark = Color(0xFFF3EBE2);
  static const textSoftDark = Color(0xFFB9AA9C);
}

// ---- Shared spacing & radius scale (reference these instead of raw numbers) ----
class KadeSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
}

class KadeRadius {
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 20.0; // matches CardTheme below
  static const pill = 999.0;
}

TextTheme _buildTextTheme(Color primary, Color soft) {
  final base = TextTheme(
    displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: primary, height: 1.2),
    displayMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: primary, height: 1.2),
    headlineLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: primary, height: 1.25),
    headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: primary, height: 1.3),
    titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: primary),
    titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: primary),
    titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primary),
    bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: primary, height: 1.5),
    bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: primary, height: 1.5),
    bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: soft, height: 1.4),
    labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primary),
    labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: soft),
    labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: soft),
  );
  // Applies the Nunito font (downloaded/cached by google_fonts) to every
  // style above while keeping the sizes/weights/colors we set.
  return GoogleFonts.nunitoTextTheme(base);
}

ThemeData buildLightTheme() {
  final textTheme = _buildTextTheme(KadeColors.textLight, KadeColors.textSoftLight);
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: KadeColors.bgLight,
    colorScheme: ColorScheme.fromSeed(
      seedColor: KadeColors.teal,
      primary: KadeColors.teal,
      surface: KadeColors.surfaceLight,
      error: KadeColors.danger,
      brightness: Brightness.light,
    ),
    textTheme: textTheme,
    dividerTheme: const DividerThemeData(color: KadeColors.borderLight, thickness: 1, space: 1),
    iconTheme: const IconThemeData(color: KadeColors.textSoftLight, size: 22),
    cardTheme: CardThemeData(
      color: KadeColors.surfaceLight,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        side: const BorderSide(color: KadeColors.borderLight),
      ),
    ),
    inputDecorationTheme: _inputTheme(KadeColors.surfaceLight, KadeColors.borderLight, KadeColors.teal, KadeColors.danger),
    appBarTheme: AppBarTheme(
      backgroundColor: KadeColors.bgLight,
      foregroundColor: KadeColors.textLight,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w700, color: KadeColors.textLight),
    ),
    elevatedButtonTheme: _elevatedButtonTheme(KadeColors.teal, Colors.white),
    outlinedButtonTheme: _outlinedButtonTheme(KadeColors.teal, KadeColors.borderLight),
    textButtonTheme: _textButtonTheme(KadeColors.teal),
    snackBarTheme: _snackBarTheme(KadeColors.textLight, KadeColors.surfaceLight),
    chipTheme: _chipTheme(KadeColors.surfaceMutedLight, KadeColors.textLight, KadeColors.borderLight),
  );
}

ThemeData buildDarkTheme() {
  final textTheme = _buildTextTheme(KadeColors.textDark, KadeColors.textSoftDark);
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: KadeColors.bgDark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: KadeColors.tealDark,
      primary: KadeColors.tealDark,
      surface: KadeColors.surfaceDark,
      error: KadeColors.dangerDark,
      brightness: Brightness.dark,
    ),
    textTheme: textTheme,
    dividerTheme: const DividerThemeData(color: KadeColors.borderDark, thickness: 1, space: 1),
    iconTheme: const IconThemeData(color: KadeColors.textSoftDark, size: 22),
    cardTheme: CardThemeData(
      color: KadeColors.surfaceDark,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        side: const BorderSide(color: KadeColors.borderDark),
      ),
    ),
    inputDecorationTheme: _inputTheme(KadeColors.surfaceDark, KadeColors.borderDark, KadeColors.tealDark, KadeColors.dangerDark),
    appBarTheme: AppBarTheme(
      backgroundColor: KadeColors.bgDark,
      foregroundColor: KadeColors.textDark,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w700, color: KadeColors.textDark),
    ),
    elevatedButtonTheme: _elevatedButtonTheme(KadeColors.tealDark, KadeColors.bgDark),
    outlinedButtonTheme: _outlinedButtonTheme(KadeColors.tealDark, KadeColors.borderDark),
    textButtonTheme: _textButtonTheme(KadeColors.tealDark),
    snackBarTheme: _snackBarTheme(KadeColors.textDark, KadeColors.surfaceDark),
    chipTheme: _chipTheme(KadeColors.surfaceMutedDark, KadeColors.textDark, KadeColors.borderDark),
  );
}

InputDecorationTheme _inputTheme(Color fill, Color border, Color focus, Color error) {
  OutlineInputBorder side(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(KadeRadius.md),
        borderSide: BorderSide(color: c, width: w),
      );
  return InputDecorationTheme(
    filled: true,
    fillColor: fill,
    contentPadding: const EdgeInsets.symmetric(horizontal: KadeSpacing.md, vertical: KadeSpacing.md),
    border: side(border),
    enabledBorder: side(border),
    focusedBorder: side(focus, 2),
    errorBorder: side(error),
    focusedErrorBorder: side(error, 2),
  );
}

ElevatedButtonThemeData _elevatedButtonTheme(Color bg, Color fg) {
  return ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      elevation: 0,
      padding: const EdgeInsets.symmetric(horizontal: KadeSpacing.lg, vertical: KadeSpacing.md),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.md)),
      textStyle: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w700),
    ),
  );
}

OutlinedButtonThemeData _outlinedButtonTheme(Color fg, Color border) {
  return OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: fg,
      side: BorderSide(color: border),
      padding: const EdgeInsets.symmetric(horizontal: KadeSpacing.lg, vertical: KadeSpacing.md),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.md)),
      textStyle: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w700),
    ),
  );
}

TextButtonThemeData _textButtonTheme(Color fg) {
  return TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: fg,
      padding: const EdgeInsets.symmetric(horizontal: KadeSpacing.sm, vertical: KadeSpacing.sm),
      textStyle: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w700),
    ),
  );
}

SnackBarThemeData _snackBarTheme(Color fg, Color bg) {
  return SnackBarThemeData(
    backgroundColor: fg, // inverted for contrast, like most Material apps
    contentTextStyle: GoogleFonts.nunito(color: bg, fontWeight: FontWeight.w600),
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.sm)),
  );
}

ChipThemeData _chipTheme(Color bg, Color fg, Color border) {
  return ChipThemeData(
    backgroundColor: bg,
    labelStyle: GoogleFonts.nunito(color: fg, fontWeight: FontWeight.w600, fontSize: 12),
    side: BorderSide(color: border),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.pill)),
    padding: const EdgeInsets.symmetric(horizontal: KadeSpacing.sm, vertical: 2),
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