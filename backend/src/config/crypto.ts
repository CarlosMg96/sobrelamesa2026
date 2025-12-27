import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = Buffer.from(
    process.env.CRYPTO_SECRET || "super_secret_crypto_key_32_chars"
);
const IV_LENGTH = 12; // recomendado para GCM

export const encrypt = (data: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

    const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decrypt = (encryptedData: string): string => {
    const buffer = Buffer.from(encryptedData, "base64");

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encryptedText = buffer.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
};
