import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  is_verified: boolean;
}

interface TokenPayload {
  userId: number;
  email: string;
  username: string;
}

/**
 * Register new user
 */
export async function register(
  email: string,
  password: string,
  username: string
): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
  // Check if user exists
  const existing = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existing.rows.length > 0) {
    throw new Error('User with this email or username already exists');
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, username)
     VALUES ($1, $2, $3)
     RETURNING id, email, username, created_at, is_verified`,
    [email, password_hash, username]
  );

  const user = result.rows[0];

  // Create default portfolio
  await query(
    `INSERT INTO portfolios (user_id, name, type, starting_cash, current_cash)
     VALUES ($1, 'Main Portfolio', 'paper', 100000, 100000)`,
    [user.id]
  );

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return { user, token };
}

/**
 * Login user
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
  // Find user
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  // Return user without password
  const { password_hash, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

/**
 * Generate JWT token
 */
function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const result = await query(
    'SELECT id, email, username, created_at, is_verified FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId: number, settings: any) {
  await query(
    'UPDATE users SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [JSON.stringify(settings), userId]
  );
}

export const authService = {
  register,
  login,
  verifyToken,
  getUserById,
  updateUserSettings,
};
