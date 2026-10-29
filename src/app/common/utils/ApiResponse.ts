import { type Response } from "express"

class ApiResponse {
    constructor(res: Response, statusCode = 200, message: string = "successful", data: any = null) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        })
    }

    static ok(res: Response, message: string = "ok", data: any = null){
        return new ApiResponse(res, 200, message, data)
    }

    static created(res: Response, message: string = "created", data: any = null){
        return new ApiResponse(res, 201, message, data)
    }

    static noContent(res: Response){
        return new ApiResponse(res, 204, "noContent")
    }

}

export default ApiResponse
