import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 * @param password The plain text password to hash.
 * @returns A promise resolving to the password hash.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain text password with a hash.
 * @param password The plain text password to check.
 * @param hash The stored hash to compare against.
 * @returns A promise resolving to a boolean representing match status.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
