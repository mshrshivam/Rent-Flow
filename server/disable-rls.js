// Disable RLS on Supabase for development
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function disableRLS() {
  const client = await pool.connect();
  try {
    console.log('Disabling Row-Level Security...\n');

    const tables = ['users', 'properties', 'units', 'tenancies', 'rent_payments', 'maintenance_requests', 'conversations', 'messages', 'notifications'];

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE IF EXISTS public.${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`✓ Disabled RLS on ${table}`);
      } catch (err) {
        console.log(`  ℹ ${table} (already disabled or doesn't exist)`);
      }
    }

    console.log('\n✅ RLS disabled successfully!');
  } catch (err) {
    console.error('Error disabling RLS:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run
disableRLS()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err.message);
    pool.end();
    process.exit(1);
  });
