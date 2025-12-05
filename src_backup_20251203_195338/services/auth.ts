import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'marketai-secure-secret-key-2025';
const SALT_ROUNDS = 10;

interface TokenPayload {
  userId: number;
  email: string;
  username: string;
  role: string;
}

export async function register(
  email: string,
  password: string,
  username: string
) {
  const existing = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existing.rows.length > 0) {
    throw new Error('User with this email or username already exists');
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (email, password_hash, username, is_verified, role)
     VALUES ($1, $2, $3, FALSE, 'user')
     RETURNING id, email, username, created_at`,
    [email, password_hash, username]
  );

  const user = result.rows[0];

  await query(
    `INSERT INTO portfolios (user_id, name, type, starting_cash, current_cash)
     VALUES ($1, 'Main Portfolio', 'paper', 100000, 100000)`,
    [user.id]
  );

  return {
    user,
    token: null,
    message: "Registration successful. Please wait for admin approval."
  };
}

export async function login(email: string, password: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  if (!user.is_verified) {
    throw new Error('Account pending approval. Contact Admin.');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export async function getUserById(userId: number) {
  const result = await query(
    'SELECT id, email, username, created_at, is_verified, role FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

export const authService = {
  register,
  login,
  verifyToken,
  getUserById,
};
