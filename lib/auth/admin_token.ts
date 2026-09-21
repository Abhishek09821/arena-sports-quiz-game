import crypto from "crypto";

const DEFAULT_ADMIN_ID = "arena-admin";
const DEFAULT_ADMIN_KEY = "arena-super-key-2026";

export function getAdminCredentials() {
  const adminId = process.env.ADMIN_PORTAL_ID || DEFAULT_ADMIN_ID;
  const adminKey = process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_KEY;
  return { adminId, adminKey };
}

export interface AdminTokenPayload {
  adminId: string;
  role: "admin";
  exp: number; // unix timestamp in ms
}

/**
 * Generate a cryptographically signed admin session token.
 */
export function generateAdminToken(adminId: string): string {
  const { adminKey } = getAdminCredentials();
  const payload: AdminTokenPayload = {
    adminId,
    role: "admin",
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", adminKey)
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify an admin session token or master key.
 */
export function verifyAdminToken(tokenOrKey: string | null | undefined): boolean {
  if (!tokenOrKey) return false;
  const { adminKey, adminId } = getAdminCredentials();

  // Direct master key match (for API or automation)
  if (tokenOrKey === adminKey) return true;

  const parts = tokenOrKey.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", adminKey)
    .update(payloadB64)
    .digest("hex");

  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    if (payload.role !== "admin") return false;
    if (payload.adminId !== adminId && payload.adminId !== DEFAULT_ADMIN_ID) return false;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}
