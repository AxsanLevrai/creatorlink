import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../db/connection';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
    cb(null, true);
  },
});

// Upload avatar
router.post('/avatar', authenticate, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const filename = `avatar_${req.user!.sub}_${Date.now()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `/uploads/${filename}`;
    await query('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, req.user!.sub]);

    res.json({ url });
  } catch (err) { next(err); }
});

// Upload banner
router.post('/banner', authenticate, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const filename = `banner_${req.user!.sub}_${Date.now()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer)
      .resize(1200, 300, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const url = `/uploads/${filename}`;
    await query('UPDATE users SET banner_url=$1 WHERE id=$2', [url, req.user!.sub]);

    res.json({ url });
  } catch (err) { next(err); }
});

// Upload portfolio image
router.post('/portfolio', authenticate, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const filename = `portfolio_${req.user!.sub}_${Date.now()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer)
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(filepath);

    res.json({ url: `/uploads/${filename}` });
  } catch (err) { next(err); }
});

// Serve uploaded files
router.use('/files', (_req, _res, next) => next());

export default router;
