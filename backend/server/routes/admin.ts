import { Router, type Request, type Response } from 'express';
import { isDbConfigured, pool } from '../db';
import { currentUser, type SessionUser } from '../auth';

export const adminRouter = Router();

async function requireOwner(req: Request, res: Response): Promise<SessionUser | null> {
  if (!isDbConfigured || !pool) {
    res.status(503).json({ error: 'DB_DISABLED', message: 'DATABASE_URL is not set.' });
    return null;
  }
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'Sign in as the shop owner.' });
      return null;
    }
    if (user.role !== 'admin' && user.role !== 'employee') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Only the shop owner can see access logs.' });
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

adminRouter.get('/admin/access', async (req, res) => {
  const user = await requireOwner(req, res);
  if (!user) return;
  try {
    const total = await pool!.query<{ count: string }>('SELECT count(*)::text AS count FROM visits');
    const today = await pool!.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM visits WHERE created_at > now() - interval '24 hours'`
    );
    const recent = await pool!.query(
      'SELECT ip, path, user_agent, created_at FROM visits ORDER BY created_at DESC LIMIT 50'
    );
    const blocked = await pool!.query('SELECT ip, reason, created_at FROM blocked_ips ORDER BY created_at DESC');
    res.json({
      totalVisits: Number(total.rows[0].count),
      visitsLast24h: Number(today.rows[0].count),
      recent: recent.rows,
      blocked: blocked.rows,
    });
  } catch (error) {
    console.error('[admin/access]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not load access stats.' });
  }
});

adminRouter.post('/admin/block', async (req, res) => {
  const user = await requireOwner(req, res);
  if (!user) return;
  const { ip, reason } = (req.body ?? {}) as { ip?: string; reason?: string };
  if (typeof ip !== 'string' || !ip.trim()) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'An IP address is required.' });
    return;
  }
  try {
    await pool!.query(
      'INSERT INTO blocked_ips (ip, reason) VALUES ($1, $2) ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason',
      [ip.trim(), typeof reason === 'string' ? reason : null]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('[admin/block]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not block the IP.' });
  }
});

adminRouter.delete('/admin/block/:ip', async (req, res) => {
  const user = await requireOwner(req, res);
  if (!user) return;
  try {
    await pool!.query('DELETE FROM blocked_ips WHERE ip = $1', [req.params.ip]);
    res.json({ ok: true });
  } catch (error) {
    console.error('[admin/unblock]', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not unblock the IP.' });
  }
});
