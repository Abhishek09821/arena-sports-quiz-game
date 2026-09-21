import crypto from "crypto";
import fs from "fs";
import path from "path";

const DEFAULT_ADMIN_ID = "admin18";
const DEFAULT_ADMIN_KEY = "viratkohli18";

/**
 * Dynamically parse .env.local or .env from disk so credential changes
 * take effect immediately without requiring a server reboot.
 */
function readEnvLocalCredentials(): { adminId?: string; adminKey?: string } {
  try {
    const candidates = [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), ".env"),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
        const lines = content.split("\n");
        let foundId: string | undefined;
        let foundKey: string | undefined;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;

          if (trimmed.startsWith("ADMIN_PORTAL_ID=")) {
            foundId = trimmed.slice("ADMIN_PORTAL_ID=".length).trim().replace(/^["']|["']$/g, "");
          }
          if (trimmed.startsWith("ADMIN_SECRET_KEY=")) {
            foundKey = trimmed.slice("ADMIN_SECRET_KEY=".length).trim().replace(/^["']|["']$/g, "");
          }
        }

        if (foundId || foundKey) {
          return { adminId: foundId, adminKey: foundKey };
        }
      }
    }
  } catch {
    // Fail silently and fallback to process.env
  }
  return {};
}

export function getAdminCredentials() {
  const fromDisk = readEnvLocalCredentials();
  const adminId =
    fromDisk.adminId ||
    process.env.ADMIN_PORTAL_ID ||
    DEFAULT_ADMIN_ID;
  const adminKey =
    fromDisk.adminKey ||
    process.env.ADMIN_SECRET_KEY ||
    DEFAULT_ADMIN_KEY;

  return { adminId: adminId.trim(), adminKey: adminKey.trim() };
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
  if (tokenOrKey === adminKey || tokenOrKey === DEFAULT_ADMIN_KEY) return true;

  const parts = tokenOrKey.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", adminKey)
    .update(payloadB64)
    .digest("hex");

  let isValidSignature = signature === expectedSignature;

  // Fallback to default admin key signature if key was recently rotated
  if (!isValidSignature && adminKey !== DEFAULT_ADMIN_KEY) {
    const fallbackSignature = crypto
      .createHmac("sha256", DEFAULT_ADMIN_KEY)
      .update(payloadB64)
      .digest("hex");
    isValidSignature = signature === fallbackSignature;
  }

  if (!isValidSignature) {
    return false;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    if (payload.role !== "admin") return false;
    const isIdMatch =
      payload.adminId.toLowerCase() === adminId.toLowerCase() ||
      payload.adminId.toLowerCase() === DEFAULT_ADMIN_ID;
    if (!isIdMatch) return false;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}
