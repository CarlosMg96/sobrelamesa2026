
import { AuthRepository } from "../repository/auth.repository";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken, verifyToken } from "../../../config/jwt";

// Errores personalizados
export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {

  constructor(private readonly repo: AuthRepository) { }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) throw new AuthError("User not found", "USER_NOT_FOUND");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new AuthError("Incorrect password", "INCORRECT_PASSWORD");

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.tipo_usuario });
    const refreshToken = signRefreshToken({ id: user.id });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.repo.updateRefreshToken(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = verifyToken(refreshToken, true);
    } catch (e) {
      throw new AuthError("Invalid refresh token", "INVALID_TOKEN");
    }

    const user = await this.repo.findById(payload.id);
    if (!user || !user.hashed_refresh_token) {
      throw new AuthError("User not found or no refresh token", "INVALID_TOKEN");
    }

    const isMatch = await bcrypt.compare(refreshToken, user.hashed_refresh_token);
    if (!isMatch) {
      throw new AuthError("Invalid refresh token", "INVALID_TOKEN");
    }

    // Generate new Access Token
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.tipo_usuario });
    // Optionally rotate refresh token here. For now, keep the same one or generate new one.
    // Let's rotate it for better security.
    const newRefreshToken = signRefreshToken({ id: user.id });
    const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.repo.updateRefreshToken(user.id, newHashedRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: number) {
    await this.repo.updateRefreshToken(userId, null);
  }

  async me(userId: number) {
    const user = await this.repo.findById(userId);
    if (!user) throw new AuthError("User not found", "USER_NOT_FOUND");
    return user;
  }

}
