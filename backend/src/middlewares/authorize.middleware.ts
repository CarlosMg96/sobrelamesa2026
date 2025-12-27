import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { sendResponse } from "../core/response";

export const authorize =
    (allowedRoles: number[]) =>
        (req: AuthRequest, res: Response, next: NextFunction) => {
            if (!req.user) {
                return sendResponse(res, 401, "Not authenticated");
            }

            // Si el rol del usuario está en el array de permitidos
            if (!allowedRoles.includes(req.user.role)) {
                return sendResponse(res, 403, "Access denied");
            }

            next();
        };
