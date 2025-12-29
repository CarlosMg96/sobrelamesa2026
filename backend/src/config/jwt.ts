import jwt, { SignOptions } from "jsonwebtoken";
import { encrypt, decrypt } from "./crypto";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key_change_this";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET; // Use a separate secret if available

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRE_TOKEN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRE_TOKEN || "7d";

// Helper to sign generic tokens
const signJwt = (payload: object, secret: string, expiresIn: string) => {
  const encryptedPayload = encrypt(JSON.stringify(payload));
  return jwt.sign({ data: encryptedPayload }, secret, { expiresIn: expiresIn as SignOptions["expiresIn"] });
};

export const signAccessToken = (payload: object) => {
  return signJwt({ ...payload, type: 'access' }, JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN);
};

export const signRefreshToken = (payload: object) => {
  return signJwt({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRES_IN);
};

// Deprecated: keeping for backward compatibility if needed, aliased to access token
export const signToken = signAccessToken;

export const verifyToken = (token: string, isRefreshToken = false) => {
  const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
  const decoded = jwt.verify(token, secret) as { data: string };
  return JSON.parse(decrypt(decoded.data));
};
