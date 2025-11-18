#!/usr/bin/env node

/**
 * Script to create a Geo-Analyst user directly via API
 * Run: node scripts/createGeoAnalyst.js
 */

const API_BASE_URL = 'http://localhost:5000/api';

const geoAnalystUser = {
  name: 'Geo Analyst User',
  email: 'geoanalyst1@gmail.com',
  password: 'Geo@123',
  phone: '+919876543210',
  designation: 'Geospatial Analyst',
  department: 'NTRO',
  userType: 'GEO_ANALYST',
  // State and district permissions (West Bengal - Purulia as example)
  states: [
    {
      stateName: 'West Bengal',
      stateCode: 'WB',
      region: 'east',
      districts: [
        {
          districtName: 'Purulia',
          districtCode: 'WB15',
          category: 'mining_intensive'
        }
      ]
    }
  ]
};

async function createGeoAnalyst() {
  console.log('🚀 Creating Geo-Analyst user...');
  console.log('📧 Email:', geoAnalystUser.email);
  console.log('🔑 Password:', geoAnalystUser.password);
  console.log('👤 Name:', geoAnalystUser.name);
  console.log('🏢 Department:', geoAnalystUser.department);
  console.log('');

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geoAnalystUser),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Geo-Analyst user created');
      console.log('');
      console.log('📝 User Details:');
      console.log('   Name:', geoAnalystUser.name);
      console.log('   Email:', geoAnalystUser.email);
      console.log('   Password:', geoAnalystUser.password);
      console.log('   Type:', geoAnalystUser.userType);
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   1. Visit http://localhost:3000/login');
      console.log('   2. Login with email: geoanalyst1@gmail.com');
      console.log('   3. Login with password: Geo@123');
      console.log('   4. You will be redirected to /geoanalyst-dashboard');
      console.log('');
    } else {
      console.error('❌ ERROR:', data.message || 'Failed to create user');
      console.error('Response:', JSON.stringify(data, null, 2));
      
      if (data.message?.includes('duplicate') || data.message?.includes('already exists')) {
        console.log('');
        console.log('ℹ️  User already exists! You can login with:');
        console.log('   Email:', geoAnalystUser.email);
        console.log('   Password:', geoAnalystUser.password);
      }
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('');
    console.error('⚠️  Make sure your backend is running on http://localhost:5000');
    console.error('   Run: npm run dev (in your backend directory)');
  }
}

createGeoAnalyst();
