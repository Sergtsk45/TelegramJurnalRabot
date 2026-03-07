/**
 * @file: tariff.ts
 * @description: Middleware для проверки доступа к функциям на основе тарифа пользователя
 * @dependencies: express, shared/tariff-features
 * @created: 2026-03-06
 */

import type { Request, Response, NextFunction } from 'express';
import { hasFeatureAccess, getQuota, FEATURES, type FeatureKey, type QuotaType } from '@shared/tariff-features';

/**
 * Middleware для проверки доступа к функции по тарифу
 * 
 * @param featureKey - Ключ функции из реестра FEATURES
 * @returns Express middleware
 * 
 * @example
 * app.post('/api/split-task', requireFeature('SPLIT_TASK'), handler);
 */
export function requireFeature(featureKey: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Проверка аутентификации
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    // Проверка доступа к функции
    const hasAccess = hasFeatureAccess(req.user.tariff, featureKey);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'TARIFF_REQUIRED',
        message: `Для этой функции требуется тариф "${FEATURES[featureKey]}" или выше`,
        feature: featureKey,
        requiredTariff: FEATURES[featureKey],
        currentTariff: req.user.tariff,
      });
    }

    // Доступ разрешен
    next();
  };
}

/**
 * Middleware для проверки квоты по тарифу
 * 
 * @param quotaType - Тип квоты из реестра QUOTAS
 * @param countFn - Функция подсчёта текущего использования ресурса
 * @returns Express middleware
 * 
 * @example
 * app.post('/api/objects', requireQuota('objects', (req) => storage.countUserObjects(req.user!.id)), handler);
 */
export function requireQuota(
  quotaType: QuotaType,
  countFn: (req: Request) => Promise<number>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    try {
      const limit = getQuota(req.user.tariff, quotaType);
      const used = await countFn(req);

      if (used >= limit) {
        return res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          message: `Достигнут лимит для вашего тарифа (${used}/${limit === Infinity ? '∞' : limit})`,
          quotaType,
          limit: limit === Infinity ? null : limit,
          used,
          currentTariff: req.user.tariff,
        });
      }

      next();
    } catch (err) {
      console.error(`Quota check failed for ${quotaType}:`, err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
