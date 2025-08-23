import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from './db'

export interface User {
  id: string
  email: string
  name: string
  created_at: Date
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
  } catch {
    return null
  }
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  const hashedPassword = await hashPassword(password)
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, hashedPassword, name]
  )
  return result.rows[0]
}

export async function getUserByEmail(email: string): Promise<User & { password_hash: string } | null> {
  const result = await pool.query(
    'SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1',
    [email]
  )
  return result.rows[0] || null
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}
