import { z } from "zod";

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
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقين.",
    path: ["confirmPassword"]
  });

export type RegisterInput = z.infer<typeof registerSchema>;
