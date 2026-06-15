import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class LuxuryBackground extends StatelessWidget {
  const LuxuryBackground({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.3,
          colors: [
            AppColors.deepNavy,
            AppColors.royalNavy,
            AppColors.midnightNavy,
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -90,
            right: -70,
            child: _GlowOrb(color: AppColors.platinum.withOpacity(0.20)),
          ),
          Positioned(
            bottom: -120,
            left: -90,
            child: _GlowOrb(color: AppColors.deepNavy.withOpacity(0.85)),
          ),
          child,
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      height: 240,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        boxShadow: [
          BoxShadow(
            color: color,
            blurRadius: 90,
            spreadRadius: 35,
          ),
        ],
      ),
    );
  }
}
