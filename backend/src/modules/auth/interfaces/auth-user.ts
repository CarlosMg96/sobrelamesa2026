export interface AuthUser {
  id: number;
  email: string;
  password: string;
  tipo_usuario: string;
  status: string;
  hashed_refresh_token?: string | null;
}