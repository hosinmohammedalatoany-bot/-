import { z } from "zod";
import { registerableRoles } from "@/lib/server/auth-constants";

const strongPassword = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير.")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير.")
  .regex(/\d/, "يجب أن تحتوي على رقم.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "الاسم الكامل مطلوب (حرفان على الأقل)."),
    email: z.string().trim().email("بريد إلكتروني غير صالح."),
    phone: z
      .string()
      .trim()
      .min(8, "رقم الهاتف مطلوب.")
      .regex(/^[\d+\s()-]{8,20}$/, "رقم الهاتف غير صالح."),
    password: strongPassword,
    confirmPassword: z.string(),
    role: z.enum(registerableRoles as [typeof registerableRoles[number], ...typeof registerableRoles]),
    branch: z.string().trim(),
    acceptTerms: z.literal(true, { message: "يجب الموافقة على الشروط والأحكام." })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقين.",
    path: ["confirmPassword"]
  })
  .refine((data) => data.branch.length >= 2, {
    message: "يجب اختيار الفرع.",
    path: ["branch"]
  });

export type RegisterInput = z.infer<typeof registerSchema>;
