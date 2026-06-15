import 'package:flutter_test/flutter_test.dart';
import 'package:baraa_raid_salman_showroom/data/models/car.dart';
import 'package:baraa_raid_salman_showroom/data/models/revenue_entry.dart';

void main() {
  test('car serializes to and from json', () {
    final now = DateTime.utc(2026, 6, 15);
    final car = Car(
      id: 'car-1',
      make: 'BMW',
      model: 'X7',
      year: 2026,
      plateNumber: 'VIP-1',
      price: 98000,
      createdAt: now,
      updatedAt: now,
    );

    final restored = Car.fromJson(car.toJson());

    expect(restored.id, car.id);
    expect(restored.make, car.make);
    expect(restored.price, car.price);
  });

  test('revenue entry serializes to and from json', () {
    final revenue = RevenueEntry(
      id: 'revenue-1',
      title: 'Reservation',
      amount: 5000,
      source: 'Main branch',
      recordedAt: DateTime.utc(2026, 6, 15),
    );

    final restored = RevenueEntry.fromJson(revenue.toJson());

    expect(restored.id, revenue.id);
    expect(restored.amount, revenue.amount);
    expect(restored.source, revenue.source);
  });
}
