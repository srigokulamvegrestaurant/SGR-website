// lib/pg_store.js - Persistent PostgreSQL State Store for Sri Gokulam Veg Restaurant
// Ensures restaurant state (menu dishes, images, prices, CMS) persists across Vercel deployments & serverless containers.

import { Pool } from 'pg';

let pool = null;

function getPgPool() {
  let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.oolonnixnuherowpodla:8HKLzdPyoGRppRTE@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
  if (!dbUrl) return null;

  // IPv6 to IPv4 Auto-Resolution:
  // Direct Supabase hostnames (db.<ref>.supabase.co) resolve only to IPv6 AAAA records.
  // Railway and cloud containers without outbound IPv6 routing fail with ENETUNREACH.
  // We automatically normalize to the IPv4 connection pooler on port 5432.
  if (dbUrl.includes('db.oolonnixnuherowpodla.supabase.co') || dbUrl.match(/@db\.[a-z0-9]+\.supabase\.co/i)) {
    dbUrl = dbUrl.replace(
      /postgres:\/\/([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/postgres/i,
      (match, user, pass, ref) => {
        const poolerUser = user.includes('.') ? user : `postgres.${ref}`;
        return `postgresql://${poolerUser}:${pass}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;
      }
    );
  }

  if (!pool) {
    try {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      pool.on('error', (err) => {
        console.warn('PostgreSQL Pool background error (non-fatal):', err.message);
      });
    } catch (e) {
      console.warn('Unable to initialize PG Pool:', e.message);
      return null;
    }
  }
  return pool;
}

let tableEnsured = false;
async function ensureAppStateTable(client) {
  if (tableEnsured) return;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    tableEnsured = true;
  } catch (e) {
    console.warn('Warning: Could not verify public.app_state table:', e.message);
  }
}

/**
 * Load state from PostgreSQL
 * @param {string} key - Key name (e.g. 'restaurant_state')
 * @returns {Promise<Object|null>}
 */
export async function loadStateFromPg(key = 'restaurant_state') {
  const p = getPgPool();
  if (!p) return null;

  let client = null;
  try {
    client = await p.connect();
    await ensureAppStateTable(client);
    const res = await client.query('SELECT value FROM public.app_state WHERE key = $1 LIMIT 1', [key]);
    if (res.rows && res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value;
    }
    return null;
  } catch (err) {
    console.warn(`[PG Store] Could not read ${key} from Postgres (falling back to disk):`, err.message);
    return null;
  } finally {
    if (client) client.release();
  }
}

/**
 * Save state to PostgreSQL asynchronously
 * @param {string} key - Key name (e.g. 'restaurant_state')
 * @param {Object} data - JavaScript Object to save
 * @returns {Promise<boolean>}
 */
export async function saveStateToPg(key = 'restaurant_state', data) {
  if (!data) return false;
  const p = getPgPool();
  if (!p) return false;

  let client = null;
  try {
    client = await p.connect();
    await ensureAppStateTable(client);
    const jsonStr = JSON.stringify(data);
    await client.query(
      `INSERT INTO public.app_state (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, jsonStr]
    );
    return true;
  } catch (err) {
    console.warn(`[PG Store] Could not save ${key} to Postgres:`, err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}
