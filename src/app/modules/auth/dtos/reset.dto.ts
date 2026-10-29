import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js";

class ResetDto extends BaseDto{
    static resetPasswordSchema = z.object({
        token: z.string().min(1, "Reset token is required").max(512, "Invalid token"),
        newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long")
        .refine((val) => /[a-z]/.test(val), { message: "Password must contain at least one lowercase letter" })
            .refine((val) => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
            .refine((val) => /\d/.test(val), { message: "Password must contain at least one number" })
            .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), { message: "Password must contain at least one special character" }),
        confirmNewPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmNewPassword, { message: "Passwords do not match"});
}

export type ResetType = z.infer<typeof ResetDto.resetPasswordSchema>
export default ResetDto
