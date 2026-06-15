class Car {
  const Car({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    required this.plateNumber,
    required this.price,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String make;
  final String model;
  final int year;
  final String plateNumber;
  final double price;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'make': make,
      'model': model,
      'year': year,
      'plateNumber': plateNumber,
      'price': price,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Car.fromJson(Map<String, dynamic> json) {
    return Car(
      id: json['id'] as String,
      make: json['make'] as String,
      model: json['model'] as String,
      year: (json['year'] as num).toInt(),
      plateNumber: json['plateNumber'] as String,
      price: (json['price'] as num).toDouble(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}
