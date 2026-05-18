import { requireRole } from './requireRole';

export const adminOnly = requireRole('admin');
