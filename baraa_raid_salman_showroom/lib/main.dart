import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'data/local/local_database_service.dart';
import 'data/repositories/showroom_repository.dart';
import 'data/sync/offline_sync_service.dart';
import 'presentation/auth/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final localDatabase = LocalDatabaseService();
  final repository = ShowroomRepository(localDatabase: localDatabase);
  await repository.initialize();

  final syncService = OfflineSyncService(
    localDatabase: localDatabase,
    cloudBaseUrl: Uri.parse('https://api.example.com/showroom/'),
  );
  await syncService.start();

  runApp(ShowroomApp(repository: repository));
}

class ShowroomApp extends StatelessWidget {
  const ShowroomApp({required this.repository, super.key});

  final ShowroomRepository repository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Baraa Raid Salman Showroom',
      theme: AppTheme.luxuryDark(),
      home: LoginScreen(repository: repository),
    );
  }
}
