/**
 * @file: objectAccess.ts
 * @description: Middleware проверки доступа пользователя к объекту строительства
 * @dependencies: server/storage.ts, server/middleware/auth.ts
 * @created: 2026-03-07
 */

import type { Request, Response, NextFunction } from 'express';
import type { Object as DbObject } from '@shared/schema';
import { storage } from '../storage';

declare global {
  namespace Express {
    interface Request {
      object?: DbObject;
      currentObjectId?: number;
    }
  }
}

/**
 * Middleware requireObjectAccess — проверяет, что объект строительства принадлежит текущему пользователю.
 *
 * Должен вызываться ПОСЛЕ authMiddleware.
 *
 * Читает objectId из:
 *   1. req.params.objectId
 *   2. req.body.objectId (fallback)
 *
 * При успехе: записывает загруженный объект в req.object и вызывает next()
 * При ошибке: возвращает 404 (объект не найден/невалидный id) или 403 (чужой объект)
 */
export async function requireObjectAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawId = req.params.objectId ?? req.body?.objectId;

  const objectId = Number(rawId);
  if (!rawId || !Number.isInteger(objectId) || objectId <= 0) {
    res.status(404).json({ error: 'Object not found', message: 'Invalid or missing objectId' });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  try {
    const object = await storage.getObject(objectId);

    if (!object) {
      res.status(404).json({ error: 'Object not found', message: `Object ${objectId} does not exist` });
      return;
    }

    if (object.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'Access to this object is not allowed' });
      return;
    }

    req.object = object;
    next();
  } catch (err) {
    console.error('[requireObjectAccess] Error loading object:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Middleware resolveCurrentObject — определяет текущий объект пользователя и записывает его id в req.currentObjectId.
 *
 * Должен вызываться ПОСЛЕ authMiddleware.
 *
 * Не блокирует запрос: если currentObjectId не установлен или пользователь не аутентифицирован,
 * просто вызывает next() без ошибки.
 *
 * Читает users.current_object_id из БД через storage.getCurrentObject().
 * Если объект не выбран — возвращает объект по умолчанию (getOrCreateDefaultObject как fallback).
 */
export async function resolveCurrentObject(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.id) {
    next();
    return;
  }

  try {
    const obj = await storage.getCurrentObject(req.user.id);
    req.currentObjectId = obj.id;
  } catch (err) {
    console.error('[resolveCurrentObject] Failed to resolve current object:', err);
  }

  next();
}
