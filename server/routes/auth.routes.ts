import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from '../db';
import { authenticateJwt, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Register new sender account
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Iltimos, to‘liq ism, email va parolni kiriting.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' });
    }

    const existing = Database.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email manzili bilan allaqachon ro‘yxatdan o‘tilgan.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = Database.createUser({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      phone: phone ? phone.trim() : undefined
    });

    const token = generateToken(user);

    return res.status(201).json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      },
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Ro‘yxatdan o‘tishda xatolik yuz berdi.' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parolni kiriting.' });
    }

    const user = Database.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email yoki parol noto‘g‘ri.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email yoki parol noto‘g‘ri.' });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at
      },
      token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Kirishda xatolik yuz berdi.' });
  }
});

// Get Current User
router.get('/me', authenticateJwt, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at
    }
  });
});

export default router;
