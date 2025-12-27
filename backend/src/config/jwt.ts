import jwt, { SignOptions } from "jsonwebtoken";
import { encrypt, decrypt } from "./crypto";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key_change_this";

const EXPIRES_IN =
  process.env.EXPIRES_IN && process.env.EXPIRES_IN !== ""
    ? process.env.EXPIRES_IN
    : "1h";

const options: SignOptions = {
  expiresIn: EXPIRES_IN as SignOptions["expiresIn"],
};

export const signToken = (payload: object) => {
  const encryptedPayload = encrypt(JSON.stringify(payload));

  return jwt.sign(
    { data: encryptedPayload },
    JWT_SECRET,
    options
  );
};

export const verifyToken = (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as { data: string };

  return JSON.parse(decrypt(decoded.data));
};
