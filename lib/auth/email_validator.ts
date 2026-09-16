/* ═══════════════════════════════════════════════════════════════
   ARENA — Strict Email Validator
   Validates RFC 5322 syntax and blocks disposable, burner,
   and fake temporary email domains.
   ═══════════════════════════════════════════════════════════════ */

// Strict RFC 5322 compliant regex with proper TLD validation (minimum 2 letters)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Blacklist of disposable, temporary, burner, and trash email services
const DISPOSABLE_DOMAINS = new Set([
  // Popular burner services
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "sharklasers.com",
  "grr.la",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "dispostable.com",
  "fakemailgenerator.com",
  "trashmail.com",
  "trashmail.net",
  "burnermail.io",
  "crazymailing.com",
  "getairmail.com",
  "maildrop.cc",
  "nada.ltd",
  "mohmal.com",
  "disposablemail.com",
  "generator.email",
  "fakeinbox.com",
  "emailondeck.com",
  "mytemp.email",
  "tempail.com",
  "inboxkitten.com",
  "minutemailbox.com",
  "internxt.com",
  "dropmail.me",
  "tmpmail.net",
  "tmpmail.org",
  "tmail.ws",
  "mailsac.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "einrot.com",
]);

// Dummy, placeholder, or obvious fake domains and usernames
const FAKE_PATTERNS = [
  /^test@/i,
  /^fake@/i,
  /^dummy@/i,
  /^asdf@/i,
  /^admin@admin\./i,
  /^user@user\./i,
  /^noone@/i,
  /@test\.[a-z]{2,}$/i,
  /@fake\.[a-z]{2,}$/i,
  /@dummy\.[a-z]{2,}$/i,
  /@asdf\.[a-z]{2,}$/i,
  /@example\.(com|org|net)$/i,
  /@sample\.(com|org|net)$/i,
  /@invalid\.[a-z]{2,}$/i,
  /@localhost$/i,
];

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validates an email address against syntax rules, burner/disposable services,
 * and dummy spam patterns.
 */
export function validateEmail(rawEmail: unknown): EmailValidationResult {
  if (typeof rawEmail !== "string") {
    return { valid: false, error: "Email must be a valid text string." };
  }

  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    return { valid: false, error: "Email address is required." };
  }

  if (email.length > 254) {
    return { valid: false, error: "Email address cannot exceed 254 characters." };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Please enter a valid email address format (e.g. name@domain.com)." };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid email address format." };
  }

  const [localPart, domain] = parts;

  if (!localPart || localPart.length > 64) {
    return { valid: false, error: "Email username section is invalid or too long." };
  }

  // Check top-level domain
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return { valid: false, error: "Email domain must have a valid top-level domain (e.g. .com, .org, .in)." };
  }

  // Check disposable email blacklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: "Temporary or disposable email addresses are not allowed. Please use a permanent email (e.g. Gmail, Outlook, Yahoo).",
    };
  }

  // Check fake/dummy patterns
  for (const pattern of FAKE_PATTERNS) {
    if (pattern.test(email)) {
      return {
        valid: false,
        error: "Fake, placeholder, or test email addresses are not permitted. Please use your genuine email.",
      };
    }
  }

  return { valid: true, normalized: email };
}
