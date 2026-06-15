class RevenueEntry {
  const RevenueEntry({
    required this.id,
    required this.title,
    required this.amount,
    required this.source,
    required this.recordedAt,
  });

  final String id;
  final String title;
  final double amount;
  final String source;
  final DateTime recordedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'amount': amount,
      'source': source,
      'recordedAt': recordedAt.toIso8601String(),
    };
  }

  factory RevenueEntry.fromJson(Map<String, dynamic> json) {
    return RevenueEntry(
      id: json['id'] as String,
      title: json['title'] as String,
      amount: (json['amount'] as num).toDouble(),
      source: json['source'] as String,
      recordedAt: DateTime.parse(json['recordedAt'] as String),
    );
  }
}
