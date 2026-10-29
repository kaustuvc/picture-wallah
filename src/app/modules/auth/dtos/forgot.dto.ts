import { z } from "zod"
import BaseDto from "../../../common/dto/base.dto.js";

class ForgotDto extends BaseDto{
    static forgotPasswordSchema = z.object({
        email: z.string().trim().pipe(z.email({message: "invalid email format"}).toLowerCase()),
    });
}

export type ForgotType = z.infer<typeof ForgotDto.forgotPasswordSchema>
export default ForgotDto
