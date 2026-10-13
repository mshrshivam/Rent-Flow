// Initialize database with test data via API
const API_URL = 'http://localhost:4000/api';

async function initializeDatabase() {
  console.log('Starting database initialization via API...\n');

  try {
    // Create test users
    console.log('Creating test users...');
    
    const users = [
      { email: 'owner@test.com', password: 'password123', fullName: 'Test Owner', role: 'owner' },
      { email: 'manager@test.com', password: 'password123', fullName: 'Test Manager', role: 'manager' },
      { email: 'tenant@test.com', password: 'password123', fullName: 'Test Tenant', role: 'tenant' },
    ];

    let ownerId, managerId, tenantId;

    for (const user of users) {
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });

        if (response.ok) {
          const data = await response.json();
          const userId = data.user.id;
          
          if (user.role === 'owner') ownerId = userId;
          if (user.role === 'manager') managerId = userId;
          if (user.role === 'tenant') tenantId = userId;
          
          console.log(`✓ Created ${user.role} user: ${user.email}`);
        } else {
          const error = await response.json();
          if (error.error === 'Email already in use') {
            console.log(`✓ ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} user already exists: ${user.email}`);
            
            // Try to login to get the ID
            const loginResponse = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, password: user.password }),
            });
            
            if (loginResponse.ok) {
              const data = await loginResponse.json();
              const userId = data.user.id;
              if (user.role === 'owner') ownerId = userId;
              if (user.role === 'manager') managerId = userId;
              if (user.role === 'tenant') tenantId = userId;
            }
          } else {
            console.error(`✗ Failed to create ${user.role} user: ${error.error}`);
          }
        }
      } catch (err) {
        console.error(`✗ Error creating ${user.role} user: ${err.message}`);
      }
    }

    if (!ownerId || !managerId || !tenantId) {
      console.error('✗ Failed to create all required users');
      return;
    }

    console.log('\nCreating test property...');

    // Create test property
    try {
      const propertyResponse = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: ownerId,
          name: 'Sunset Apartments',
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90001',
          country: 'USA',
        }),
      });

      if (propertyResponse.ok) {
        const property = await propertyResponse.json();
        const propertyId = property.id;
        console.log(`✓ Created property: Sunset Apartments`);

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
          try {
            const unitResponse = await fetch(`${API_URL}/units`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                property_id: propertyId,
                unit_number: unit.number,
                unit_type: unit.type,
                bedrooms: unit.bedrooms,
                bathrooms: unit.bathrooms,
                rent_amount: unit.rent,
                status: 'available',
                area_sqft: unit.sqft,
              }),
            });

            if (unitResponse.ok) {
              const unitData = await unitResponse.json();
              unitIds.push(unitData.id);
              console.log(`✓ Created unit ${unit.number}: ${unit.type} (₹${unit.rent.toLocaleString('en-IN')}/month)`);
            } else {
              console.error(`✗ Failed to create unit ${unit.number}`);
            }
          } catch (err) {
            console.error(`✗ Error creating unit ${unit.number}: ${err.message}`);
          }
        }

        console.log('\nCreating test tenancy...');

        // Create test tenancy
        if (unitIds.length > 0) {
          try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 3);
            
            const tenancyResponse = await fetch(`${API_URL}/tenants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: 'tenant@test.com',
                full_name: 'Test Tenant',
                unit_id: unitIds[0],
                start_date: startDate.toISOString().split('T')[0],
              }),
            });

            if (tenancyResponse.ok) {
              console.log(`✓ Created tenancy: Test Tenant → Unit 101`);
            } else {
              const error = await tenancyResponse.json();
              console.error(`✗ Failed to create tenancy: ${error.error}`);
            }
          } catch (err) {
            console.error(`✗ Error creating tenancy: ${err.message}`);
          }
        }
      } else {
        const error = await propertyResponse.json();
        console.error(`✗ Failed to create property: ${error.error}`);
      }
    } catch (err) {
      console.error(`✗ Error creating property: ${err.message}`);
    }

    console.log('\n✅ Database initialization complete!\n');
    console.log('Test credentials:');
    console.log('  Owner  : owner@test.com / password123');
    console.log('  Manager: manager@test.com / password123');
    console.log('  Tenant : tenant@test.com / password123');
    console.log('\n🎉 You can now access the application at http://localhost:8080');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
