// Debug script to test Supabase connection and users table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Debug Script');
console.log('URL:', supabaseUrl);
console.log('Key present:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('\n1️⃣ Testing basic connection...');
  
  try {
    // Test 1: Basic auth check
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth test:', authError ? 'Failed' : 'Success');
    if (authError) console.log('Auth error:', authError.message);
    
    // Test 2: Try to query users table with anon key
    console.log('\n2️⃣ Testing users table query (anon key)...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .limit(5);
    
    console.log('Users query:', usersError ? 'Failed' : 'Success');
    if (usersError) {
      console.log('Users error:', usersError.message);
      console.log('Error details:', usersError);
    } else {
      console.log('Users found:', users.length);
      console.log('Sample data:', users);
    }
    
    // Test 3: Try with service role key
    console.log('\n3️⃣ Testing with service role key...');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: adminUsers, error: adminError } = await adminSupabase
        .from('users')
        .select('id, full_name, email, role')
        .limit(5);
      
      console.log('Service role query:', adminError ? 'Failed' : 'Success');
      if (adminError) {
        console.log('Service role error:', adminError.message);
      } else {
        console.log('Users found with service role:', adminUsers.length);
      }
    }
    
    // Test 4: Check leads table for comparison
    console.log('\n4️⃣ Testing leads table for comparison...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email')
      .limit(5);
    
    console.log('Leads query:', leadsError ? 'Failed' : 'Success');
    if (leadsError) {
      console.log('Leads error:', leadsError.message);
    } else {
      console.log('Leads found:', leads.length);
    }
    
  } catch (error) {
    console.log('❌ Script error:', error.message);
  }
}

testConnection();