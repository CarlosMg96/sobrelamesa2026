import { AuthUser } from "../interfaces/auth-user";

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
}
