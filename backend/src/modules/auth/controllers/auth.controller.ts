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
})();
