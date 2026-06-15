import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

import '../local/local_database_service.dart';
import '../models/pending_sync_item.dart';

class OfflineSyncService {
  OfflineSyncService({
    required LocalDatabaseService localDatabase,
    required Uri cloudBaseUrl,
    http.Client? httpClient,
  })  : _localDatabase = localDatabase,
        _cloudBaseUrl = cloudBaseUrl,
        _httpClient = httpClient ?? http.Client();

  final LocalDatabaseService _localDatabase;
  final Uri _cloudBaseUrl;
  final http.Client _httpClient;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  Future<void> start() async {
    final initialStatus = await Connectivity().checkConnectivity();
    if (_hasConnection(initialStatus)) {
      await syncNow();
    }

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
      (status) async {
        if (_hasConnection(status)) {
          await syncNow();
        }
      },
    );
  }

  Future<void> stop() async {
    await _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  Future<void> syncNow() async {
    final pendingItems = _localDatabase.getPendingSyncItems();

    for (final item in pendingItems) {
      final synced = await _send(item);
      if (synced) {
        await _localDatabase.deletePendingSyncItem(item.id);
      } else {
        await _localDatabase.markSyncAttempt(item);
      }
    }
  }

  Future<bool> _send(PendingSyncItem item) async {
    final endpoint = item.endpoint.replaceFirst(RegExp(r'^/+'), '');
    final url = _cloudBaseUrl.resolve(endpoint);
    final headers = {'Content-Type': 'application/json'};
    final body = jsonEncode(item.payload);
    final response = switch (item.method.toUpperCase()) {
      'POST' => await _httpClient.post(url, headers: headers, body: body),
      'PUT' => await _httpClient.put(url, headers: headers, body: body),
      'PATCH' => await _httpClient.patch(url, headers: headers, body: body),
      _ => await _httpClient.post(url, headers: headers, body: body),
    };

    return response.statusCode >= 200 && response.statusCode < 300;
  }

  bool _hasConnection(List<ConnectivityResult> status) {
    return status.any((result) => result != ConnectivityResult.none);
  }
}
