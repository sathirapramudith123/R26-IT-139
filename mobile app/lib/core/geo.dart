import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'i18n.dart';

// "6.91182, 79.97460" — a delivery location saved as raw coordinates
final _coordText = RegExp(r'^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$');

/// (lat, lng) when [text] is just coordinates, otherwise null.
(double, double)? parseCoordText(String? text) {
  final m = _coordText.firstMatch(text ?? "");
  if (m == null) return null;
  final lat = double.parse(m[1]!), lng = double.parse(m[2]!);
  return lat.abs() <= 90 && lng.abs() <= 180 ? (lat, lng) : null;
}

final _cache = <String, Future<String?>>{};

/// Street address for a map point (Google Geocoding, same as the location picker); null when unknown.
Future<String?> reverseGeocode(double lat, double lng) {
  final key = "${lat.toStringAsFixed(5)},${lng.toStringAsFixed(5)}";
  return _cache.putIfAbsent(key, () async {
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/geocode/json", {
        "latlng": "$lat,$lng",
        "key": AppConfig.googleMapsApiKey,
      });
      final data = jsonDecode((await http.get(uri)).body);
      final results = data["results"] as List?;
      final addr = (results != null && results.isNotEmpty) ? results[0]["formatted_address"] as String? : null;
      if (addr == null) _cache.remove(key); // try again next time
      return addr;
    } catch (_) {
      _cache.remove(key);
      return null;
    }
  });
}

/// A saved location as text — never raw "lat, lng": those are shown as the looked-up address.
class LocationText extends StatelessWidget {
  final String value;
  final TextStyle? style;
  final TextAlign textAlign;
  const LocationText(this.value, {super.key, this.style, this.textAlign = TextAlign.start});

  @override
  Widget build(BuildContext context) {
    final point = parseCoordText(value);
    if (point == null) return Text(value, style: style, textAlign: textAlign);
    return FutureBuilder<String?>(
      future: reverseGeocode(point.$1, point.$2),
      builder: (context, snap) => Text(
        snap.connectionState != ConnectionState.done ? tr("Finding address…") : (snap.data ?? tr("Pinned on the map")),
        style: style,
        textAlign: textAlign,
      ),
    );
  }
}
