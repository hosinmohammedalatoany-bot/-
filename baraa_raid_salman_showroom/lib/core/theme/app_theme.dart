import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData luxuryDark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.midnightNavy,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.platinum,
        secondary: AppColors.brushedSilver,
        surface: AppColors.royalNavy,
        error: AppColors.danger,
      ),
      textTheme: AppTextStyles.textTheme(),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.glassWhite,
        hintStyle: const TextStyle(color: AppColors.brushedSilver),
        labelStyle: const TextStyle(color: AppColors.platinum),
        prefixIconColor: AppColors.platinum,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppColors.platinum, width: 1.5),
        ),
      ),
    );
  }
}
