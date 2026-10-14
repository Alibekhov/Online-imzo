import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Database } from '../db';
import { User } from '../db/types';

export interface AuthRequest extends Request {
  user?: User;
}

const JWT_SECRET = process.env.JWT_SECRET || 'docsign-telegram-secret-2026';

export function authenticateJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi (Token mavjud emas)' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = Database.findUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Yaroqsiz yoki muddati o‘tgan sessiya tokeni' });
  }
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}
