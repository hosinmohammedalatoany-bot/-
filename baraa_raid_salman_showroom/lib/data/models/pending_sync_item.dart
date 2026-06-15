class PendingSyncItem {
  const PendingSyncItem({
    required this.id,
    required this.endpoint,
    required this.method,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
  });

  final String id;
  final String endpoint;
  final String method;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retryCount;

  PendingSyncItem copyWith({int? retryCount}) {
    return PendingSyncItem(
      id: id,
      endpoint: endpoint,
      method: method,
      payload: payload,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'endpoint': endpoint,
      'method': method,
      'payload': payload,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
    };
  }

  factory PendingSyncItem.fromJson(Map<String, dynamic> json) {
    return PendingSyncItem(
      id: json['id'] as String,
      endpoint: json['endpoint'] as String,
      method: json['method'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      createdAt: DateTime.parse(json['createdAt'] as String),
      retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
    );
  }
}
