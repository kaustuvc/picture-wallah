import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js";

class LoginDto extends BaseDto{
    static loginSchema = z.object({
        email: z.string().trim().pipe(z.email({message: "invalid email format"}).toLowerCase()),
        password: z.string().min(1, "Password is required"),
    });
}

export type LoginType = z.infer<typeof LoginDto.loginSchema>
export default LoginDto
