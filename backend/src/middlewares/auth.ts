import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import { sendResponse } from "../core/response";

export interface AuthUser {
  id: number;
  email: string;
  role: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return sendResponse(res, 401, "Not provided token");
  }

  try {
    const token = authHeader.split(" ")[1];

    const payload = verifyToken(token);

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    return sendResponse(res, 401, "Token invalid or expired");
  }
};
