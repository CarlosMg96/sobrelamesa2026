import { AuthUser } from "../interfaces/auth-user";

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: number): Promise<AuthUser | null>;
  updateRefreshToken(userId: number, hashedRefreshToken: string | null): Promise<void>;
  createUser(user: AuthUser): Promise<AuthUser>;
  deleteUser(userId: number): Promise<void>;
  updateUser(user: AuthUser): Promise<AuthUser>;
}
