import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

class AppTextStyles {
  const AppTextStyles._();

  static TextTheme textTheme() {
    final base = GoogleFonts.cairoTextTheme();

    return base.copyWith(
      headlineLarge: GoogleFonts.cairo(
        color: AppColors.softPlatinum,
        fontSize: 32,
        fontWeight: FontWeight.w800,
        height: 1.2,
      ),
      titleLarge: GoogleFonts.cairo(
        color: AppColors.softPlatinum,
        fontSize: 22,
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: GoogleFonts.cairo(
        color: AppColors.platinum,
        fontSize: 16,
        fontWeight: FontWeight.w500,
      ),
      bodyMedium: GoogleFonts.cairo(
        color: AppColors.brushedSilver,
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
      labelLarge: GoogleFonts.cairo(
        color: AppColors.midnightNavy,
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
