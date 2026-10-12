# Mobile app (Flutter)

The same merchant features as the web app on Android: transactions, inventory, procurement, suppliers,
agency banking, reports and the Predictions hub.

## Run

```bash
flutter pub get
flutter run
```

Backend URL: the Android emulator uses `http://10.0.2.2:5000/api/v1` by default; for a real phone see
`config/README.md` (`config/phone.json` with your computer's IP address).

## Keys (never committed)

- `android/local.properties` — `MAPS_API_KEY=...` for the Android map view.
- Map search, addresses and routes (Places, Geocoding, Directions) go through the backend
  (`/api/v1/maps/...`), which holds the web-service key as `GOOGLE_MAPS_API_KEY` in `backend/.env`.
  The app itself needs no `.env`.

## Structure

```
lib/
  main.dart            app entry, routes, session handling
  core/                API client, configuration, theme, PDF reports
  services/            one service per backend resource (auth, insights, agent banks, ...)
  config/modules.dart  field definitions for the generic list / form screens
  screens/             one folder per module + dashboard, settings, profile
  widgets/             shared widgets
  models/              data models
```

## Sinhala / English

Text is wrapped in `tr("English text")` (`lib/core/i18n.dart`); the Sinhala text lives in
`lib/core/si_strings.dart`, keyed by the English text. A missing translation falls back to English. The
language is chosen in Settings (or on the login screen) and saved on the phone.

Formatting: `dart format --line-length 110 lib`. Checks: `flutter analyze`.
