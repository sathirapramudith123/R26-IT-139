import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart' show money, numOf, qtyOf;
import 'supplier_route_screen.dart';

/// All suppliers on one map, nearest first (web: Suppliers page → Map).
/// Distances here are straight-line; "Show route" opens the road route for one supplier.
class SuppliersMapView extends StatefulWidget {
  final List<Map<String, dynamic>> suppliers;
  const SuppliersMapView({super.key, required this.suppliers});
  @override
  State<SuppliersMapView> createState() => _SuppliersMapViewState();
}

class _SuppliersMapViewState extends State<SuppliersMapView> {
  static const _sriLanka = LatLng(7.8731, 80.7718);
  GoogleMapController? _map;
  LatLng? _me;
  bool _locating = false;
  String? _locError;

  List<Map<String, dynamic>> get _located =>
      widget.suppliers.where((s) => s["latitude"] != null && s["longitude"] != null).toList();

  LatLng _pos(Map s) => LatLng(numOf(s["latitude"]), numOf(s["longitude"]));

  double? _km(Map s) {
    if (_me == null) return null;
    final p = _pos(s);
    return Geolocator.distanceBetween(_me!.latitude, _me!.longitude, p.latitude, p.longitude) / 1000;
  }

  @override
  void initState() {
    super.initState();
    _locate();
  }

  Future<void> _locate() async {
    setState(() {
      _locating = true;
      _locError = null;
    });
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        _locError = tr("Location permission denied.");
      } else {
        final p = await Geolocator.getCurrentPosition();
        _me = LatLng(p.latitude, p.longitude);
      }
    } catch (_) {
      _locError = tr("Couldn't get your location.");
    } finally {
      if (mounted) {
        setState(() => _locating = false);
        _fit();
      }
    }
  }

  // zoom so every pin (and you) is on screen
  void _fit() {
    final pts = [..._located.map(_pos), ?_me];
    if (_map == null || pts.isEmpty) return;
    if (pts.length == 1) {
      _map!.animateCamera(CameraUpdate.newLatLngZoom(pts.first, 12));
      return;
    }
    double minLat = pts.first.latitude, maxLat = minLat, minLng = pts.first.longitude, maxLng = minLng;
    for (final p in pts) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    _map!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(minLat, minLng), northeast: LatLng(maxLat, maxLng)),
        48,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final located = _located;
    if (_me != null) located.sort((a, b) => _km(a)!.compareTo(_km(b)!));
    final nearest = _me != null && located.isNotEmpty ? located.first : null;
    final unlocated = widget.suppliers.length - located.length;
    final soft = Theme.of(context).textTheme.bodySmall?.color;

    final markers = <Marker>{
      for (final s in located)
        Marker(
          markerId: MarkerId("${s["id"]}"),
          position: _pos(s),
          infoWindow: InfoWindow(title: "${s["name"] ?? ""}"),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            identical(s, nearest) ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueRed,
          ),
        ),
      if (_me != null)
        Marker(
          markerId: const MarkerId("me"),
          position: _me!,
          infoWindow: InfoWindow(title: tr("Your shop")),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ),
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(KadeRadius.md),
          child: SizedBox(
            height: 260,
            child: GoogleMap(
              initialCameraPosition: const CameraPosition(target: _sriLanka, zoom: 7),
              markers: markers,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              // let the map pan/zoom inside the scrolling list
              gestureRecognizers: {Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer())},
              onMapCreated: (c) {
                _map = c;
                _fit();
              },
            ),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: Text(
                "🔵 ${tr("Your shop")} · 🟢 ${tr("Nearest supplier")} · 🔴 ${tr("Other suppliers")}",
                style: TextStyle(fontSize: 11, color: soft),
              ),
            ),
            if (_me == null)
              TextButton.icon(
                onPressed: _locating ? null : _locate,
                icon: const Icon(Icons.my_location, size: 16),
                label: Text(_locating ? tr("Locating…") : tr("Use My Location")),
              ),
          ],
        ),
        if (_locError != null) Text(_locError!, style: const TextStyle(color: KadeColors.terra, fontSize: 12)),
        const SizedBox(height: 10),
        Text(
          _me != null ? tr("Suppliers by distance") : tr("Suppliers on the map"),
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        if (located.isEmpty)
          Text(tr("No supplier has a map location yet."), style: TextStyle(color: soft))
        else
          for (final s in located) _card(s, identical(s, nearest)),
        if (unlocated > 0)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              "$unlocated ${tr("more without a saved map location")}",
              style: TextStyle(fontSize: 12, color: soft),
            ),
          ),
      ],
    );
  }

  Widget _card(Map<String, dynamic> s, bool isNearest) {
    final km = _km(s);
    final items = s["items_supplied"] is List ? (s["items_supplied"] as List).length : 0;
    final soft = Theme.of(context).textTheme.bodySmall;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: isNearest
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(KadeRadius.lg),
              side: const BorderSide(color: KadeColors.success, width: 1.5),
            )
          : null,
      child: InkWell(
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        onTap: () => _map?.animateCamera(CameraUpdate.newLatLngZoom(_pos(s), 14)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text("${s["name"] ?? "—"}", style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        if (isNearest) ...[
                          const SizedBox(width: 6),
                          Text(
                            tr("📍 Nearest"),
                            style: const TextStyle(
                              fontSize: 11,
                              color: KadeColors.success,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (km != null) "${km.toStringAsFixed(1)} km",
                        "${money(s["delivery_cost"])} ${tr("delivery")}",
                        "${qtyOf(s["lead_time_days"] ?? 1)}${tr("-day delivery")}",
                        if (items > 0) "$items ${tr("items")}",
                      ].join(" · "),
                      style: soft,
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: tr("How far? Show route"),
                icon: const Icon(Icons.directions_outlined),
                onPressed: () =>
                    Navigator.push(context, MaterialPageRoute(builder: (_) => SupplierRouteScreen(supplier: s))),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
