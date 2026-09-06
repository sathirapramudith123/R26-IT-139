import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../core/theme.dart';

// Read from the .env file at the project root — see location_picker_map.dart
// for the full explanation of why this only covers Dart-side REST calls.
String get _kGoogleApiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

/// Read-only map: "how far is this supplier/agent from me, and how long
/// would it take to drive there right now?" No search box, nothing to tap —
/// just fetches the user's current location on load and draws the route.
///
/// Drop this into a supplier or agent detail screen:
///   SupplierDistanceMap(
///     destinationLat: supplier.latitude,
///     destinationLng: supplier.longitude,
///     destinationLabel: supplier.name,
///   )
class SupplierDistanceMap extends StatefulWidget {
  final double destinationLat;
  final double destinationLng;
  final String? destinationLabel;
  final double height;

  const SupplierDistanceMap({
    super.key,
    required this.destinationLat,
    required this.destinationLng,
    this.destinationLabel,
    this.height = 220,
  });

  @override
  State<SupplierDistanceMap> createState() => _SupplierDistanceMapState();
}

class _SupplierDistanceMapState extends State<SupplierDistanceMap> {
  GoogleMapController? _controller;
  LatLng? _userLocation;
  Set<Polyline> _polylines = {};
  String? _distanceKm;
  int? _durationMin;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        setState(() {
          _loading = false;
          _error = "Location permission denied.";
        });
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      _userLocation = LatLng(pos.latitude, pos.longitude);
      await _fetchRoute();
    } catch (_) {
      setState(() {
        _loading = false;
        _error = "Couldn't get your location.";
      });
    }
  }

  Future<void> _fetchRoute() async {
    final origin = _userLocation!;
    final dest = LatLng(widget.destinationLat, widget.destinationLng);
    try {
      final uri = Uri.https("maps.googleapis.com", "/maps/api/directions/json", {
        "origin": "${origin.latitude},${origin.longitude}",
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
        setState(() {
          _polylines = {
            Polyline(
              polylineId: const PolylineId("route"),
              color: const Color(0xFF0D9488),
              width: 4,
              points: points.map((p) => LatLng(p.latitude, p.longitude)).toList(),
            ),
          };
          _distanceKm = ((leg["distance"]["value"] as num) / 1000).toStringAsFixed(1);
          _durationMin = ((leg["duration"]["value"] as num) / 60).round();
          _loading = false;
        });
        _fitCamera(origin, dest);
      } else {
        setState(() {
          _loading = false;
          _error = "No route found";
        });
      }
    } catch (_) {
      setState(() {
        _loading = false;
        _error = "Couldn't fetch route";
      });
    }
  }

  void _fitCamera(LatLng a, LatLng b) {
    if (_controller == null) return;
    final bounds = LatLngBounds(
      southwest: LatLng(
        a.latitude < b.latitude ? a.latitude : b.latitude,
        a.longitude < b.longitude ? a.longitude : b.longitude,
      ),
      northeast: LatLng(
        a.latitude > b.latitude ? a.latitude : b.latitude,
        a.longitude > b.longitude ? a.longitude : b.longitude,
      ),
    );
    _controller!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 60));
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
    final dest = LatLng(widget.destinationLat, widget.destinationLng);

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        height: widget.height,
        child: Stack(
          children: [
            GoogleMap(
              initialCameraPosition: CameraPosition(target: dest, zoom: 13),
              onMapCreated: (c) => _controller = c,
              markers: {
                Marker(
                  markerId: const MarkerId("destination"),
                  position: dest,
                  infoWindow: InfoWindow(title: widget.destinationLabel),
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                ),
                if (_userLocation != null)
                  Marker(
                    markerId: const MarkerId("me"),
                    position: _userLocation!,
                    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                    infoWindow: const InfoWindow(title: "You"),
                  ),
              },
              polylines: _polylines,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              scrollGesturesEnabled: false,
              zoomGesturesEnabled: false,
              rotateGesturesEnabled: false,
              tiltGesturesEnabled: false,
            ),
            if (_loading)
              Container(
                color: Colors.black.withOpacity(0.05),
                child: const Center(child: CircularProgressIndicator()),
              ),
            if (!_loading && (_distanceKm != null || _error != null))
              Positioned(
                left: 10,
                right: 10,
                top: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(10)),
                  child: Text(
                    _distanceKm != null
                        ? "🚗 $_distanceKm km away · ⏱ about ${_formatDuration(_durationMin)} drive"
                        : _error!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: _distanceKm != null ? teal : Colors.grey,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}