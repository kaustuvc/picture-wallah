import { z } from "zod";
import BaseDto from "../../../common/dto/base.dto.js";

class RegisterDto extends BaseDto{
    static registerSchema = z.object({
        name: z.string().trim().min(2, "Name must be at least 2 characters long").max(255, "Name must be at most 255 characters long"),
        email: z.string().trim().pipe(z.email({message: "invalid email format"}).toLowerCase()),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters long")
            .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
            .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
            .refine((val) => /\d/.test(val), { message: "Password must contain at least one number" })
            .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), { message: "Password must contain at least one special character" }),
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match"});
}

export type RegisterType = z.infer<typeof RegisterDto.registerSchema>;
export default RegisterDto
