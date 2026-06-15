import '../local/local_database_service.dart';
import '../models/car.dart';
import '../models/revenue_entry.dart';

class ShowroomRepository {
  const ShowroomRepository({required LocalDatabaseService localDatabase})
      : _localDatabase = localDatabase;

  final LocalDatabaseService _localDatabase;

  Future<void> initialize() async {
    await _localDatabase.initialize();
  }

  Future<void> saveCar(Car car) async {
    await _localDatabase.saveCar(car);
  }

  Future<void> saveRevenue(RevenueEntry revenue) async {
    await _localDatabase.saveRevenue(revenue);
  }

  List<Car> getCars() {
    return _localDatabase.getCars();
  }

  List<RevenueEntry> getRevenues() {
    return _localDatabase.getRevenues();
  }

  Future<bool> isEmailAvailable(String email) async {
    return await _localDatabase.isEmailAvailable(email);
  }

  Future<void> rememberRegisteredEmail(String email) async {
    await _localDatabase.rememberRegisteredEmail(email);
  }
}
