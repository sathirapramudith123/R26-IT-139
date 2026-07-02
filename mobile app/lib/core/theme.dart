import 'package:flutter/material.dart';

const seedColor = Color(0xFF0F766E);

ThemeData buildTheme() => ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: seedColor),
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    );