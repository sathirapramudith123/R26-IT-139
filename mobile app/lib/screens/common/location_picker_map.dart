import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/theme.dart';

/// Free OpenStreetMap-based location picker (Google API key එකක් ඕන නෑ).
/// Tap කරලා location එකක් pick කරන්න පුළුවන්. Selected point එක onPick එකෙන් දෙනවා.
class LocationPickerMap extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;
  final void Function(double lat, double lng) onPick;
  final double height;

  const LocationPickerMap({
    super.key,
    this.initialLat,
    this.initialLng,
    required this.onPick,
    this.height = 260,
  });

  @override
  State<LocationPickerMap> createState() => _LocationPickerMapState();
}

class _LocationPickerMapState extends State<LocationPickerMap> {
  final MapController _controller = MapController();
  LatLng? _picked;

  // Default center — Colombo, Sri Lanka
  static const LatLng _slCenter = LatLng(6.9271, 79.8612);

  @override
  void initState() {
    super.initState();
    if (widget.initialLat != null && widget.initialLng != null) {
      _picked = LatLng(widget.initialLat!, widget.initialLng!);
    }
  }

  void _setPoint(LatLng p, {bool move = false}) {
    setState(() => _picked = p);
    widget.onPick(p.latitude, p.longitude);
    if (move) _controller.move(p, 15);
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

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final center = _picked ?? _slCenter;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _controller,
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: _picked != null ? 15 : 11,
                    onTap: (tapPos, latlng) => _setPoint(latlng),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                      userAgentPackageName: "com.smartmerchant.app",
                      maxZoom: 19,
                    ),
                    if (_picked != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _picked!,
                            width: 44,
                            height: 44,
                            alignment: Alignment.topCenter,
                            child: const Icon(Icons.location_on, color: Colors.red, size: 42),
                          ),
                        ],
                      ),
                  ],
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
              ? "Tap on the map to pick the delivery location"
              : "Picked: ${_picked!.latitude.toStringAsFixed(5)}, ${_picked!.longitude.toStringAsFixed(5)}",
          style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
        ),
      ],
    );
  }
}