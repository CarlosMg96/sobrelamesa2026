// src/core/response.ts

import { Response } from "express";

export function sendResponse(res: Response, status: number, message: string, data: any = null) {
  return res.status(status).json({ status, message, data });
}
