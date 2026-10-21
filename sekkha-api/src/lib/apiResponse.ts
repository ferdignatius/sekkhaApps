import type { Response } from "express"

export function apiSuccess<T>(res: Response, code: number, message: string, data: T) {
  return res.status(code).json({ status: "success", code, message, data })
}

export function apiFailure(res: Response, code: number, message: string, data: null = null) {
  return res.status(code).json({ status: "fail", code, message, data })
}
