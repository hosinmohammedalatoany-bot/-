export type PasswordStrength = "weak" | "fair" | "strong";

export function assessPasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  message: string;
  valid: boolean;
} {
  const p = password;
  let score = 0;
  if (p.length >= 8) score += 1;
  if (p.length >= 12) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;

  const valid = p.length >= 8 && score >= 3;
  let strength: PasswordStrength = "weak";
  let message = "كلمة مرور ضعيفة — استخدم 8 أحرف على الأقل مع أرقام وحروف.";

  if (score >= 4) {
    strength = "strong";
    message = "كلمة مرور قوية.";
  } else if (score >= 3) {
    strength = "fair";
    message = "كلمة مرور مقبولة — يُفضّل إضافة رموز أو زيادة الطول.";
  }

  return { strength, score, message, valid };
}
