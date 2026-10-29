import { type Request, type Response, type NextFunction } from "express";
import { ZodType } from "zod";
import ApiError from "../utils/ApiError.js";

const validate = (Dtoclass: ZodType) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = Dtoclass.safeParse(req.body)
        if(!result.success){
            const errors = result.error.issues.map((e) => e.message)
            throw ApiError.badRequest(errors.join("; "))
        }
        req.body = result.data
        next()
    }
}

export default validate
