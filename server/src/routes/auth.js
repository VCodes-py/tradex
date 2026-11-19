import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate, HttpError } from '../middleware/http.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, baseCurrency: u.baseCurrency });

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
});

router.post(
  '/register',
  limiter,
  validate(credentials.extend({ name: z.string().trim().max(80).optional() })),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists.');
    const user = await User.create({ email, name, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  })
);

router.post(
  '/login',
  limiter,
  validate(credentials),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new HttpError(401, 'Email or password is incorrect.');
    res.json({ token: signToken(user._id), user: publicUser(user) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(401, 'Account not found. Sign in again.');
    res.json({ user: publicUser(user) });
  })
);

router.patch(
  '/me',
  requireAuth,
  validate(z.object({
    name: z.string().trim().max(80).optional(),
    baseCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code.').optional(),
  })),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.userId, req.body, { new: true });
    if (!user) throw new HttpError(401, 'Account not found. Sign in again.');
    res.json({ user: publicUser(user) });
  })
);

export default router;
