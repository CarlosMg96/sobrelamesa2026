import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../../../middlewares/auth";

const router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);

export default router;


