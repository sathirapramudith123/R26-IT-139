import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

class AppConfig {
  /// Backend URL given at run/build time, e.g.
  ///   flutter run --dart-define-from-file=config/phone.json
  ///   flutter build apk --dart-define=API_BASE_URL=https://api.example.com/api/v1
  static const String _fromBuild = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_fromBuild.isNotEmpty) return _fromBuild;
    // Local-development defaults when nothing is passed:
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return "http://10.0.2.2:5000/api/v1"; // Android emulator -> this computer
    }
    return "http://localhost:5000/api/v1"; // iOS simulator, web, desktop
  }

  /// Google Maps web-service key (Places / Geocoding / Directions), given at build time:
  ///   flutter run --dart-define-from-file=.env
  /// Kept out of the app's assets and out of git (see .env.example).
  static const String googleMapsApiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
}
