// Initialize database with test data
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Starting database initialization...\n');

    // Create test users
    console.log('Creating test users...');
    
    const ownerHash = await bcrypt.hash('password123', 10);
    const managerHash = await bcrypt.hash('password123', 10);
    const tenantHash = await bcrypt.hash('password123', 10);

    // Check if users already exist
    const existingOwner = await client.query('SELECT id FROM users WHERE email = $1', ['owner@test.com']);
    const existingManager = await client.query('SELECT id FROM users WHERE email = $1', ['manager@test.com']);
    const existingTenant = await client.query('SELECT id FROM users WHERE email = $1', ['tenant@test.com']);

    let ownerId, managerId, tenantId;

    if (existingOwner.rows.length === 0) {
      const result = await client.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['owner@test.com', ownerHash, 'Test Owner', 'owner']
      );
      ownerId = result.rows[0].id;
      console.log('✓ Created owner user: owner@test.com');
    } else {
      ownerId = existingOwner.rows[0].id;
      console.log('✓ Owner user already exists');
    }

    if (existingManager.rows.length === 0) {
      const result = await client.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['manager@test.com', managerHash, 'Test Manager', 'manager']
      );
      managerId = result.rows[0].id;
      console.log('✓ Created manager user: manager@test.com');
    } else {
      managerId = existingManager.rows[0].id;
      console.log('✓ Manager user already exists');
    }

    if (existingTenant.rows.length === 0) {
      const result = await client.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['tenant@test.com', tenantHash, 'Test Tenant', 'tenant']
      );
      tenantId = result.rows[0].id;
      console.log('✓ Created tenant user: tenant@test.com');
    } else {
      tenantId = existingTenant.rows[0].id;
      console.log('✓ Tenant user already exists');
    }

    console.log('\nCreating test properties...');

    // Create test properties
    const propertyResult = await client.query(
      'INSERT INTO properties (owner_id, name, address, city, state, postal_code, country) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [ownerId, 'Sunset Apartments', '123 Main Street', 'Los Angeles', 'CA', '90001', 'USA']
    );
    const propertyId = propertyResult.rows[0].id;
    console.log(`✓ Created property: Sunset Apartments (${propertyId})`);

    console.log('\nCreating test units...');

    // Create test units
    const units = [
      { number: '101', type: '1BHK', bedrooms: 1, bathrooms: 1, rent: 15000, sqft: 750 },
      { number: '102', type: '2BHK', bedrooms: 2, bathrooms: 2, rent: 24000, sqft: 950 },
      { number: '201', type: '2BHK', bedrooms: 2, bathrooms: 1, rent: 22000, sqft: 900 },
      { number: '202', type: '3BHK', bedrooms: 3, bathrooms: 2, rent: 32000, sqft: 1200 },
    ];

    const unitIds = [];
    for (const unit of units) {
      const result = await client.query(
        'INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, rent_amount, status, area_sqft) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [propertyId, unit.number, unit.type, unit.bedrooms, unit.bathrooms, unit.rent, 'available', unit.sqft]
      );
      unitIds.push(result.rows[0].id);
      console.log(`✓ Created unit ${unit.number}: ${unit.type} (₹${unit.rent.toLocaleString('en-IN')}/month)`);
    }

    console.log('\nCreating test tenancies...');

    // Create test tenancy (link tenant to first unit)
    if (unitIds.length > 0) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Started 3 months ago
      
      const tenancyResult = await client.query(
        'INSERT INTO tenancies (unit_id, tenant_id, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [unitIds[0], tenantId, startDate.toISOString().split('T')[0], null, true]
      );
      console.log(`✓ Created tenancy: Test Tenant → Unit 101`);

      // Update unit status to occupied
      await client.query('UPDATE units SET status = $1 WHERE id = $2', ['occupied', unitIds[0]]);
      console.log(`✓ Updated unit 101 status to occupied`);
    }

    console.log('\n✅ Database initialization complete!\n');
    console.log('Test credentials:');
    console.log('  Owner  : owner@test.com / password123');
    console.log('  Manager: manager@test.com / password123');
    console.log('  Tenant : tenant@test.com / password123');
    console.log('\nYou can now access the application!');

  } catch (err) {
    console.error('Error during initialization:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run initialization
initializeDatabase()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
  });
