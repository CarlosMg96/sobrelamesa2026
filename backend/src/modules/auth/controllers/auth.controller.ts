import { AuthService, AuthError } from "../services/auth.service";
import { AuthMySQLRepository } from "../repository/auth.repository.mysql";
import { sendResponse } from "../../../core/response";

const repo = new AuthMySQLRepository();
const service = new AuthService(repo);

export const authController = new (class AuthController {
  login = async (req, res) => {
    try {
      if (!req.body) {
        return sendResponse(res, 400, "Missing request body");
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return sendResponse(res, 400, "Email and password are required");
      }
      const result = await service.login(email, password);
      return sendResponse(res, 200, "Login successful", result);
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.code === "USER_NOT_FOUND" || error.code === "INCORRECT_PASSWORD") {
          return sendResponse(res, 401, "Invalid credentials");
        }
      }
      console.error("Error in login:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  };

  refresh = async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendResponse(res, 400, "Refresh token is required");
      }
      const result = await service.refresh(refreshToken);
      return sendResponse(res, 200, "Token refreshed", result);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendResponse(res, 401, error.message);
      }
      console.error("Error in refresh:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  };

  logout = async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return sendResponse(res, 401, "Unauthorized");
      }
      await service.logout(userId);
      return sendResponse(res, 200, "Logout successful");
    } catch (error) {
      console.error("Error in logout:", error);
      return sendResponse(res, 500, "Internal server error");
    }
  };
})();
