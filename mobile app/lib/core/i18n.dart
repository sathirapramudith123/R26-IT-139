import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'si_strings.dart';

/// Sinhala / English text for the app.
/// The English text itself is the key: tr("Total Income") returns the Sinhala text when Sinhala is
/// selected and a translation exists, otherwise the English text — so a missing translation never breaks.
class LanguageController {
  static final ValueNotifier<String> lang = ValueNotifier('en');
  static const _storage = FlutterSecureStorage();
  static const _key = 'app_language';

  static bool get isSinhala => lang.value == 'si';

  /// Restores the language saved on this phone (call once at startup).
  static Future<void> load() async {
    try {
      if (await _storage.read(key: _key) == 'si') lang.value = 'si';
    } catch (_) {}
  }

  static Future<void> set(String code) async {
    lang.value = code == 'si' ? 'si' : 'en';
    try {
      await _storage.write(key: _key, value: lang.value);
    } catch (_) {}
  }
}

String tr(String text) => LanguageController.isSinhala ? (siStrings[text] ?? text) : text;
