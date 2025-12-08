import crypto from "crypto";

/**
 * Generate a cryptographically secure random password
 * @param length Password length (default: 32)
 * @returns Random password string
 */
export function generateSecurePassword(length: number = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const charsetLength = charset.length;
  let password = "";

  // Use crypto.randomBytes for cryptographically secure random numbers
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charsetLength;
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Generate a database-safe password (no special chars that could break connection strings)
 * @param length Password length (default: 32)
 * @returns Random password string (alphanumeric only)
 */
export function generateDatabasePassword(length: number = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charsetLength = charset.length;
  let password = "";

  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charsetLength;
    password += charset[randomIndex];
  }

  return password;
}

/**
 * Sanitize a string for use as a database/user name
 * @param input Input string
 * @returns Sanitized string (lowercase, alphanumeric + underscores only)
 */
export function sanitizeDatabaseName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .substring(0, 63); // Postgres name length limit
}

