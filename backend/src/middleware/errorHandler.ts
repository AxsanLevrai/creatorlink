import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Application error', { error: err.message, stack: err.stack, path: req.path });
    }
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Postgres unique violation
  if ((err as any).code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }

  // Postgres FK violation
  if ((err as any).code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
