import 'package:hive_flutter/hive_flutter.dart';

import '../models/car.dart';
import '../models/pending_sync_item.dart';
import '../models/revenue_entry.dart';

class BoxNames {
  const BoxNames._();

  static const String cars = 'cars';
  static const String revenues = 'revenues';
  static const String registeredEmails = 'registered_emails';
  static const String pendingSync = 'pending_sync';
}

class LocalDatabaseService {
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<Map>(BoxNames.cars),
      Hive.openBox<Map>(BoxNames.revenues),
      Hive.openBox<String>(BoxNames.registeredEmails),
      Hive.openBox<Map>(BoxNames.pendingSync),
    ]);
    _initialized = true;
  }

  Future<void> saveCar(Car car) async {
    await _cars.put(car.id, car.toJson());
    await enqueueSync(
      endpoint: '/cars',
      method: 'POST',
      payload: car.toJson(),
    );
  }

  Future<void> saveRevenue(RevenueEntry revenue) async {
    await _revenues.put(revenue.id, revenue.toJson());
    await enqueueSync(
      endpoint: '/revenues',
      method: 'POST',
      payload: revenue.toJson(),
    );
  }

  Future<bool> isEmailAvailable(String email) async {
    return !_registeredEmails.values.contains(_normalizeEmail(email));
  }

  Future<void> rememberRegisteredEmail(String email) async {
    final normalizedEmail = _normalizeEmail(email);
    await _registeredEmails.put(normalizedEmail, normalizedEmail);
  }

  List<Car> getCars() {
    return _cars.values
        .map((value) => Car.fromJson(Map<String, dynamic>.from(value)))
        .toList(growable: false);
  }

  List<RevenueEntry> getRevenues() {
    return _revenues.values
        .map((value) => RevenueEntry.fromJson(Map<String, dynamic>.from(value)))
        .toList(growable: false);
  }

  Future<void> enqueueSync({
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
  }) async {
    final now = DateTime.now();
    final item = PendingSyncItem(
      id: '${endpoint}_${payload['id']}_${now.microsecondsSinceEpoch}',
      endpoint: endpoint,
      method: method,
      payload: payload,
      createdAt: now,
    );

    await _pendingSync.put(item.id, item.toJson());
  }

  List<PendingSyncItem> getPendingSyncItems() {
    return _pendingSync.values
        .map((value) => PendingSyncItem.fromJson(Map<String, dynamic>.from(value)))
        .toList(growable: false);
  }

  Future<void> deletePendingSyncItem(String id) async {
    await _pendingSync.delete(id);
  }

  Future<void> markSyncAttempt(PendingSyncItem item) async {
    await _pendingSync.put(
      item.id,
      item.copyWith(retryCount: item.retryCount + 1).toJson(),
    );
  }

  Box<Map> get _cars => Hive.box<Map>(BoxNames.cars);
  Box<Map> get _revenues => Hive.box<Map>(BoxNames.revenues);
  Box<String> get _registeredEmails => Hive.box<String>(BoxNames.registeredEmails);
  Box<Map> get _pendingSync => Hive.box<Map>(BoxNames.pendingSync);

  String _normalizeEmail(String email) {
    return email.trim().toLowerCase();
  }
}
