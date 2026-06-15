import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/luxury_background.dart';
import '../../data/models/car.dart';
import '../../data/models/revenue_entry.dart';
import '../../data/repositories/showroom_repository.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({required this.repository, super.key});

  final ShowroomRepository repository;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _carsCount = 0;
  double _totalRevenue = 0;

  @override
  void initState() {
    super.initState();
    _loadLocalSnapshot();
  }

  void _loadLocalSnapshot() {
    final cars = widget.repository.getCars();
    final revenues = widget.repository.getRevenues();
    setState(() {
      _carsCount = cars.length;
      _totalRevenue = revenues.fold<double>(
        0,
        (total, revenue) => total + revenue.amount,
      );
    });
  }

  Future<void> _saveDemoOfflineData() async {
    final now = DateTime.now();
    await widget.repository.saveCar(
      Car(
        id: 'car-${now.microsecondsSinceEpoch}',
        make: 'Mercedes-Benz',
        model: 'S-Class',
        year: now.year,
        plateNumber: 'VIP-${now.second}',
        price: 125000,
        createdAt: now,
        updatedAt: now,
      ),
    );
    await widget.repository.saveRevenue(
      RevenueEntry(
        id: 'rev-${now.microsecondsSinceEpoch}',
        title: 'دفعة حجز سيارة',
        amount: 15000,
        source: 'الفرع الرئيسي',
        recordedAt: now,
      ),
    );
    _loadLocalSnapshot();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return LuxuryBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('لوحة المعرض'),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'العمل بدون إنترنت مفعّل',
                style: textTheme.headlineLarge,
              ),
              const SizedBox(height: 12),
              Text(
                'أي سيارة أو إيراد يتم حفظه فورًا في Hive ثم ينتظر المزامنة مع السحابة.',
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: 28),
              _MetricCard(label: 'السيارات المحفوظة محليًا', value: '$_carsCount'),
              const SizedBox(height: 16),
              _MetricCard(
                label: 'إجمالي الإيرادات المحلية',
                value: '\$${_totalRevenue.toStringAsFixed(0)}',
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: _saveDemoOfflineData,
                icon: const Icon(Icons.save_alt_rounded),
                label: const Text('جرّب حفظ بيانات محلية'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.glassWhite,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyLarge),
          Text(value, style: Theme.of(context).textTheme.titleLarge),
        ],
      ),
    );
  }
}
