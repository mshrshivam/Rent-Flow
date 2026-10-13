// Check database structure and try to understand the RLS error
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Decode the password
const dbUrl = process.env.DATABASE_URL;
const decodedUrl = dbUrl.replace(/%40/g, '@'); // %40 is @
console.log('Using connection:', decodedUrl.replace(/:[^:]*@/, ':***@'));

const pool = new pg.Pool({
  connectionString: decodedUrl,
});

async function checkDatabase() {
  const client = await pool.connect();
  try {
    console.log('Checking database structure...\n');

    // Check which tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in public schema:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check if users table exists
    const usersTable = await client.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users')
    `);

    if (usersTable.rows[0].exists) {
      console.log('\n✓ users table exists');
      
      // Try to count users
      const userCount = await client.query('SELECT COUNT(*) FROM public.users');
      console.log(`  Users count: ${userCount.rows[0].count}`);
    } else {
      console.log('\n✗ users table does NOT exist');
    }

    console.log('\n✅ Database check complete');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'XX000') {
      console.error('\nThis is a Supabase RLS error. The database user may not have permission to access tables.');
      console.error('Try disabling RLS through Supabase dashboard or using a service role key.');
    }
  } finally {
    client.release();
  }
}

// Run
checkDatabase()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err.message);
    pool.end();
    process.exit(1);
  });
