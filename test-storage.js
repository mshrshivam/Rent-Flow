// Test script - Run in browser console to check localStorage

console.log('=== CHECKING STORED DATA ===');

// Check properties
const properties = localStorage.getItem('properties');
console.log('Properties:', properties ? JSON.parse(properties) : 'None');

// Check units
const units = localStorage.getItem('units');
console.log('Units:', units ? JSON.parse(units) : 'None');

// Check if units exist for a specific property
if (properties && units) {
  const propList = JSON.parse(properties);
  const unitList = JSON.parse(units);
  
  console.log('\n=== PROPERTY-UNIT MAPPING ===');
  propList.forEach(prop => {
    const propUnits = unitList.filter(u => u.property_id === prop.id);
    console.log(`Property: ${prop.name} (${prop.id})`);
    console.log(`  Units: ${propUnits.length}`);
    propUnits.forEach(u => {
      console.log(`    - Unit ${u.unit_number} (₹${Number(u.monthly_rent).toLocaleString('en-IN')}/month)`);
    });
  });
}

console.log('\n=== INSTRUCTIONS ===');
console.log('1. If no units shown, go to Properties page');
console.log('2. Select a property');
console.log('3. Click "Add Unit"');
console.log('4. Fill form and submit');
console.log('5. Run this script again');
