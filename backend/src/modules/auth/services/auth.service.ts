
import { AuthRepository } from "../repository/auth.repository";
import bcrypt from "bcryptjs";
import { signToken } from "../../../config/jwt";

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
    const token = signToken({ id: user.id, email: user.email, role: user.tipo_usuario });
    return { token };
  }
}
