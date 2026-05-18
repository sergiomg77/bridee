import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ data: null, error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('role', role)
      .maybeSingle();

    if (error) {
      logger.error('requireRole query failed', error);
      res.status(500).json({ data: null, error: 'Internal server error' });
      return;
    }

    if (!data) {
      res.status(403).json({ data: null, error: 'Forbidden' });
      return;
    }

    next();
  };
}
