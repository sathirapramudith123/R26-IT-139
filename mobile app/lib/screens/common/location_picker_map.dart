import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../core/theme.dart';

// Read from the .env file at the project root (see main.dart, which loads
// it via dotenv.load() before runApp). This covers the Places search and
// Directions REST calls made from Dart — the native map SDKs (Android/iOS)
// still read their own separate copy of the key from AndroidManifest.xml
// and AppDelegate.swift, since those load before Flutter/dotenv does.
String get _kGoogleApiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

/// One extra marker to plot alongside the picked point — e.g. suppliers of
/// the item being procured, with [highlight] marking the nearest one.
class MapMarkerPoint {
  final double lat;
  final double lng;
  final String? label;
  final bool highlight; // nearest — drawn green, and used as the route destination
  final bool cheapest; // drawn yellow
  const MapMarkerPoint({
    required this.lat,
    required this.lng,
    this.label,
    this.highlight = false,
    this.cheapest = false,
  });
}

/// Google Maps-based location picker with a Places search box.
/// Tap the map (or search and pick a suggestion) to choose a location;
/// the selected point is reported via [onPick].
///
/// Optionally also draws a driving route + shows distance/time — pass
/// [destinationLat]/[destinationLng] (or an [extraMarkers] entry with
/// highlight: true) to enable it. SupplierForm just doesn't pass these,
/// so nothing changes there.
class LocationPickerMap extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;
  final void Function(double lat, double lng) onPick;
  final double height;

  // Optional: called with a human-readable address for the picked point —
  // the Places description when picked via search, or a reverse-geocoded
  // address when picked by tapping the map / using current location. Forms
  // that want to auto-fill a "delivery location" text field from the map
  // pin (instead of asking the user to type it) can wire this up; forms
  // that only need the numbers just don't pass it.
  final void Function(String address)? onAddress;

  final double? destinationLat;
  final double? destinationLng;
  final String? destinationLabel;
  final List<MapMarkerPoint> extraMarkers;
  final bool showRoute;

  const LocationPickerMap({
    super.key,
    this.initialLat,
    this.initialLng,
    required this.onPick,
    this.height = 260,
    this.onAddress,
    this.destinationLat,
    this.destinationLng,
    this.destinationLabel,
    this.extraMarkers = const [],
    this.showRoute = true,
  });

  @override
  State<LocationPickerMap> createState() => _LocationPickerMapState();
}

class _LocationPickerMapState extends State<LocationPickerMap> {
  GoogleMapController? _controller;
  LatLng? _picked;

  // Default center — Colombo, Sri Lanka
  static const LatLng _slCenter = LatLng(6.9271, 79.8612);

  final TextEditingController _searchCtrl = TextEditingController();
  Timer? _debounce;
  List<_PlaceSuggestion> _suggestions = [];
  bool _searching = false;

  Set<Polyline> _polylines = {};
  String? _routeDistanceKm;
  int? _routeDurationMin;
  String? _routeError;

  @override
  void initState() {
    super.initState();
    if (widget.initialLat != null && widget.initialLng != null) {
      _picked = LatLng(widget.initialLat!, widget.initialLng!);
    }
    _maybeFetchRoute();
  }

  @override
  void didUpdateWidget(covariant LocationPickerMap old) {
    super.didUpdateWidget(old);
    if (old.destinationLat != widget.destinationLat ||
        old.destinationLng != widget.destinationLng ||
        old.showRoute != widget.showRoute) {
      _maybeFetchRoute();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  LatLng? get _destination {
    if (widget.destinationLat != null && widget.destinationLng != null) {
      return LatLng(widget.destinationLat!, widget.destinationLng!);
    }
    final hi = widget.extraMarkers.where((m) => m.highlight);
    if (hi.isNotEmpty) return LatLng(hi.first.lat, hi.first.lng);
    return null;
  }

  void _setPoint(LatLng p, {bool move = false, String? knownAddress}) {
    setState(() => _picked = p);
    widget.onPick(p.latitude, p.longitude);
    if (move) _controller?.animateCamera(CameraUpdate.newLatLngZoom(p, 16));
    _maybeFetchRoute();

    if (knownAddress != null) {
      widget.onAddress?.call(knownAddress);
    } else if (widget.onAddress != null) {
      _reverseGeocode(p);
    }
  }

  Future<void> _reverseGeocode(LatLng p) async {
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/geocode/json", {
        "latlng": "${p.latitude},${p.longitude}",
        "key": _kGoogleApiKey,
      });
      final res = await http.get(uri);
      final data = jsonDecode(res.body);
      final results = data["results"] as List?;
      final addr = (results != null && results.isNotEmpty) ? results[0]["formatted_address"] as String? : null;
      if (addr != null) widget.onAddress?.call(addr);
    } catch (_) {
      // Silent — the user can still type/edit the address field manually.
    }
  }

  Future<void> _useMyLocation() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        _snack("Location permission denied.");
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      _setPoint(LatLng(pos.latitude, pos.longitude), move: true);
    } catch (_) {
      _snack("Couldn't get your location.");
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ---------------- Places Autocomplete search ----------------

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    if (query.trim().isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () => _fetchSuggestions(query));
  }

  Future<void> _fetchSuggestions(String query) async {
    setState(() => _searching = true);
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/place/autocomplete/json", {
        "input": query,
        "key": _kGoogleApiKey,
      });
      final res = await http.get(uri);
      final data = jsonDecode(res.body);
      if (data["status"] == "OK") {
        final preds = (data["predictions"] as List)
            .map((p) => _PlaceSuggestion(placeId: p["place_id"], description: p["description"]))
            .toList();
        if (mounted) setState(() => _suggestions = preds);
      } else if (mounted) {
        setState(() => _suggestions = []);
      }
    } catch (_) {
      if (mounted) setState(() => _suggestions = []);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _selectSuggestion(_PlaceSuggestion s) async {
    setState(() {
      _suggestions = [];
      _searchCtrl.text = s.description;
    });
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/place/details/json", {
        "place_id": s.placeId,
        "fields": "geometry",
        "key": _kGoogleApiKey,
      });
      final res = await http.get(uri);
      final data = jsonDecode(res.body);
      final loc = data["result"]?["geometry"]?["location"];
      if (loc != null) {
        _setPoint(
          LatLng((loc["lat"] as num).toDouble(), (loc["lng"] as num).toDouble()),
          move: true,
          knownAddress: s.description,
        );
      }
    } catch (_) {
      _snack("Couldn't look up that place.");
    }
  }

  // ---------------- Directions (distance + time) ----------------

  Future<void> _maybeFetchRoute() async {
    final dest = _destination;
    if (!widget.showRoute || _picked == null || dest == null) {
      if (mounted) {
        setState(() {
          _polylines = {};
          _routeDistanceKm = null;
          _routeDurationMin = null;
          _routeError = null;
        });
      }
      return;
    }
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/directions/json", {
        "origin": "${_picked!.latitude},${_picked!.longitude}",
        "destination": "${dest.latitude},${dest.longitude}",
        "mode": "driving",
        "key": _kGoogleApiKey,
      });
      final res = await http.get(uri);
      final data = jsonDecode(res.body);
      if (data["status"] == "OK" && (data["routes"] as List).isNotEmpty) {
        final route = data["routes"][0];
        final leg = route["legs"][0];
        final points = PolylinePoints().decodePolyline(route["overview_polyline"]["points"]);
        if (mounted) {
          setState(() {
            _polylines = {
              Polyline(
                polylineId: const PolylineId("route"),
                color: const Color(0xFF0D9488),
                width: 4,
                points: points.map((p) => LatLng(p.latitude, p.longitude)).toList(),
              ),
            };
            _routeDistanceKm = ((leg["distance"]["value"] as num) / 1000).toStringAsFixed(1);
            _routeDurationMin = ((leg["duration"]["value"] as num) / 60).round();
            _routeError = null;
          });
        }
      } else if (mounted) {
        setState(() {
          _polylines = {};
          _routeDistanceKm = null;
          _routeDurationMin = null;
          _routeError = "No route found";
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _polylines = {};
          _routeError = "Couldn't fetch route";
        });
      }
    }
  }

  String? _formatDuration(int? mins) {
    if (mins == null) return null;
    if (mins < 60) return "$mins min";
    final h = mins ~/ 60;
    final m = mins % 60;
    return m != 0 ? "${h}h ${m}min" : "${h}h";
  }

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final center = _picked ?? _slCenter;

    final markers = <Marker>{
      if (_picked != null)
        Marker(
          markerId: const MarkerId("picked"),
          position: _picked!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ),
      for (final m in widget.extraMarkers)
        Marker(
          markerId: MarkerId("extra_${m.lat}_${m.lng}"),
          position: LatLng(m.lat, m.lng),
          infoWindow: InfoWindow(title: m.label),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            m.highlight
                ? BitmapDescriptor.hueGreen
                : m.cheapest
                    ? BitmapDescriptor.hueYellow
                    : BitmapDescriptor.hueRed,
          ),
        ),
      if (widget.destinationLat != null && widget.destinationLng != null)
        Marker(
          markerId: const MarkerId("destination"),
          position: LatLng(widget.destinationLat!, widget.destinationLng!),
          infoWindow: InfoWindow(title: widget.destinationLabel),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: [
                GoogleMap(
                  initialCameraPosition: CameraPosition(target: center, zoom: _picked != null ? 15 : 11),
                  onMapCreated: (c) => _controller = c,
                  onTap: (p) => _setPoint(p),
                  markers: markers,
                  polylines: _polylines,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                ),

                // Search box + suggestions dropdown
                Positioned(
                  left: 10,
                  right: 66,
                  top: 10,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Material(
                        borderRadius: BorderRadius.circular(10),
                        elevation: 2,
                        child: TextField(
                          controller: _searchCtrl,
                          onChanged: _onSearchChanged,
                          decoration: InputDecoration(
                            hintText: "Search a place or address…",
                            filled: true,
                            fillColor: Theme.of(context).cardColor,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                            suffixIcon: _searching
                                ? const Padding(
                                    padding: EdgeInsets.all(12),
                                    child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                  )
                                : null,
                          ),
                        ),
                      ),
                      if (_suggestions.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
                          ),
                          constraints: const BoxConstraints(maxHeight: 180),
                          child: ListView.builder(
                            shrinkWrap: true,
                            padding: EdgeInsets.zero,
                            itemCount: _suggestions.length,
                            itemBuilder: (_, i) {
                              final s = _suggestions[i];
                              return ListTile(
                                dense: true,
                                leading: const Icon(Icons.place_outlined, size: 18),
                                title: Text(s.description, style: const TextStyle(fontSize: 13)),
                                onTap: () => _selectSuggestion(s),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),

                // Distance/time badge — only shown once a route is found
                if (_routeDistanceKm != null || _routeError != null)
                  Positioned(
                    right: 10,
                    top: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(8)),
                      child: Text(
                        _routeDistanceKm != null
                            ? "🚗 $_routeDistanceKm km · ⏱ ${_formatDuration(_routeDurationMin)}"
                            : _routeError!,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _routeDistanceKm != null ? teal : Colors.grey,
                        ),
                      ),
                    ),
                  ),

                // "Use My Location" button
                Positioned(
                  right: 10,
                  bottom: 10,
                  child: FloatingActionButton.small(
                    heroTag: "loc_fab",
                    backgroundColor: teal,
                    onPressed: _useMyLocation,
                    child: const Icon(Icons.my_location, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          _picked == null
              ? "Tap on the map or search to pick the delivery location"
              : "Picked: ${_picked!.latitude.toStringAsFixed(5)}, ${_picked!.longitude.toStringAsFixed(5)}",
          style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
        ),
      ],
    );
  }
}

class _PlaceSuggestion {
  final String placeId;
  final String description;
  const _PlaceSuggestion({required this.placeId, required this.description});
}