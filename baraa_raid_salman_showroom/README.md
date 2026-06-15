# Baraa Raid Salman Showroom

Flutter foundation for a luxury, offline-first showroom app that targets iOS,
Android, and web from one codebase.

## Structure

- `lib/core`: shared theme, constants, and reusable widgets.
- `lib/data`: local storage, repositories, models, and sync services.
- `lib/presentation`: screens and UI flows.

## Run locally

This cloud environment does not include the Flutter SDK. On a machine with
Flutter installed, run:

```bash
flutter pub get
flutter run -d chrome
```

If you want generated platform folders, run this once from inside this folder:

```bash
flutter create . --platforms=android,ios,web
```

## Offline-first behavior

The app writes cars and revenue entries to Hive immediately. Each write also
adds a pending sync record. `OfflineSyncService` retries queued items when
connectivity returns.
