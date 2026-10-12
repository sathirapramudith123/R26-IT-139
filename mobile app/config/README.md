# Backend URL for the mobile app

The app reads the backend URL from `API_BASE_URL` at run/build time
(see `lib/core/config.dart`). With no value it uses `http://10.0.2.2:5000/api/v1`
on the Android emulator and `http://localhost:5000/api/v1` elsewhere.

| Where the app runs | Command |
|---|---|
| Android emulator | `flutter run` (or `--dart-define-from-file=config/emulator.json`) |
| Real phone on the same Wi-Fi | copy `phone.example.json` to `phone.json`, put your computer's IPv4 address (from `ipconfig`) in it, then `flutter run --dart-define-from-file=config/phone.json` |
| Release / demo build | `flutter build apk --release --dart-define=API_BASE_URL=https://your-api.example.com/api/v1` |

`phone.json` is git-ignored because each computer has its own IP address.

For a real phone, the backend port (5000) must be allowed through the computer's
firewall, and the phone and computer must be on the same Wi-Fi network.
Check from the phone's browser first: `http://<your-ip>:5000/health`.
