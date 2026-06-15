import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/social_auth_links.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/luxury_background.dart';
import '../../data/repositories/showroom_repository.dart';
import '../dashboard/dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({required this.repository, super.key});

  final ShowroomRepository repository;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  String _companyType = 'الفرع الرئيسي';
  bool _isLoading = false;

  static const List<String> _companyTypes = [
    'الفرع الرئيسي',
    'فرع المبيعات',
    'فرع الصيانة',
    'شركة شريكة',
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);
    final isAvailable = await widget.repository.isEmailAvailable(
      _emailController.text,
    );

    if (!mounted) {
      return;
    }

    if (!isAvailable) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('هذا الإيميل مسجل مسبقًا')),
      );
      return;
    }

    await widget.repository.rememberRegisteredEmail(_emailController.text);

    if (!mounted) {
      return;
    }

    setState(() => _isLoading = false);
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => DashboardScreen(repository: widget.repository),
      ),
    );
  }

  Future<void> _openSocialAuth(Uri url) async {
    final opened = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر فتح رابط تسجيل الدخول')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: LuxuryBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(32),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                      child: Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: AppColors.glassWhite,
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(color: AppColors.glassBorder),
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Icon(
                                Icons.directions_car_filled_rounded,
                                color: AppColors.platinum,
                                size: 56,
                              ),
                              const SizedBox(height: 18),
                              Text(
                                'معرض براء رائد سلمان',
                                textAlign: TextAlign.center,
                                style: textTheme.headlineLarge,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'تسجيل دخول فاخر وآمن لإدارة السيارات والإيرادات',
                                textAlign: TextAlign.center,
                                style: textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 28),
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'الإيميل',
                                  prefixIcon: Icon(Icons.email_outlined),
                                ),
                                validator: _validateEmail,
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: true,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'كلمة السر',
                                  prefixIcon: Icon(Icons.lock_outline_rounded),
                                ),
                                validator: _validatePassword,
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'رقم الهاتف',
                                  prefixIcon: Icon(Icons.phone_outlined),
                                ),
                                validator: _validatePhone,
                              ),
                              const SizedBox(height: 16),
                              DropdownButtonFormField<String>(
                                value: _companyType,
                                decoration: const InputDecoration(
                                  labelText: 'نوع الشركة / الفرع',
                                  prefixIcon: Icon(Icons.apartment_rounded),
                                ),
                                dropdownColor: AppColors.royalNavy,
                                items: _companyTypes
                                    .map(
                                      (type) => DropdownMenuItem<String>(
                                        value: type,
                                        child: Text(type),
                                      ),
                                    )
                                    .toList(growable: false),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _companyType = value);
                                  }
                                },
                              ),
                              const SizedBox(height: 24),
                              FilledButton(
                                onPressed: _isLoading ? null : _submit,
                                child: _isLoading
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text('دخول إلى النظام'),
                              ),
                              const SizedBox(height: 22),
                              Text(
                                'أو الدخول عبر',
                                textAlign: TextAlign.center,
                                style: textTheme.bodyMedium,
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                alignment: WrapAlignment.center,
                                children: [
                                  _SocialButton(
                                    label: 'Apple',
                                    icon: Icons.apple,
                                    onPressed: () => _openSocialAuth(
                                      SocialAuthLinks.apple,
                                    ),
                                  ),
                                  _SocialButton(
                                    label: 'TikTok',
                                    icon: Icons.music_note_rounded,
                                    onPressed: () => _openSocialAuth(
                                      SocialAuthLinks.tiktok,
                                    ),
                                  ),
                                  _SocialButton(
                                    label: 'Facebook',
                                    icon: Icons.facebook_rounded,
                                    onPressed: () => _openSocialAuth(
                                      SocialAuthLinks.facebook,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) {
      return 'اكتب الإيميل';
    }
    if (!email.contains('@') || !email.contains('.')) {
      return 'اكتب إيميل صحيح';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if ((value ?? '').length < 6) {
      return 'كلمة السر يجب أن تكون 6 أحرف على الأقل';
    }
    return null;
  }

  String? _validatePhone(String? value) {
    final phone = value?.trim() ?? '';
    if (phone.length < 8) {
      return 'اكتب رقم هاتف صحيح';
    }
    return null;
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.platinum,
        side: const BorderSide(color: AppColors.glassBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
    );
  }
}
