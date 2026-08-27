"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default marker icon fix (Next.js/webpack doesn't bundle Leaflet's default
// icon images correctly, so we point directly at the CDN versions instead).
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Invisible helper component: listens for map clicks and reports lat/lng
// back to the parent via onPick(lat, lng).
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({ coords, onPick }) {
  const center = coords ? [coords.lat, coords.lng] : [6.9147, 79.9727]; // Malabe default

  // We keep the real Leaflet map instance in a plain ref that WE control.
  // If we pass this ref straight to <MapContainer ref={...}>, React itself
  // nulls it out during Strict Mode's simulated unmount ("disappear" phase)
  // *before* our own useEffect cleanup runs — so by the time cleanup fires,
  // mapRef.current is already null and .remove() never gets called, leaving
  // Leaflet's internal _leaflet_id stuck on the DOM node.
  //
  // Using our own callback ref instead lets us ignore React's null-detach
  // call and only clear the ref ourselves, after we've actually called
  // .remove() on the instance.
  const mapRef = useRef(null);

  function handleMapRef(mapInstance) {
    if (mapInstance) {
      mapRef.current = mapInstance;
    }
  }

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={coords ? 15 : 13}
      className="h-72 w-full"
      scrollWheelZoom={true}
      ref={handleMapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler onPick={onPick} />
      {coords && <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />}
    </MapContainer>
  );
}