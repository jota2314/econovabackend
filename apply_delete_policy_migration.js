// Script to apply the missing DELETE policy for permits table
// This fixes the RLS issue preventing permit deletions

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

async function applyMigration() {
  // Create Supabase client with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log('🔄 Applying DELETE policy migration for permits table...')
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250912000001_add_permits_delete_policy.sql', 'utf8')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: migrationSQL 
    })
    
    if (error) {
      // Try alternative approach if exec_sql RPC doesn't exist
      console.log('🔄 Trying alternative approach...')
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.startsWith('CREATE POLICY')) {
          // For CREATE POLICY statements, we'll use a direct approach
          const { error: policyError } = await supabase
            .from('_realtime')
            .select('*')
            .limit(1)
          
          if (policyError && policyError.code !== 'PGRST116') {
            console.error('❌ Database connection error:', policyError)
            return
          }
          
          console.log('✅ Successfully connected to database')
          console.log('📝 Migration SQL to execute manually:')
          console.log(migrationSQL)
          console.log('\n🔧 Please execute this SQL in your Supabase SQL Editor at:')
          console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/amonwicqzmmpzybnzthp/sql')}/new`)
          return
        }
      }
    } else {
      console.log('✅ Successfully applied DELETE policy migration!')
    }
    
  } catch (err) {
    console.error('❌ Error applying migration:', err.message)
    console.log('\n📝 Please execute this SQL manually in Supabase SQL Editor:')
    console.log(fs.readFileSync('./supabase/migrations/20250912000001_add_permits_delete_policy.sql', 'utf8'))
    console.log(`\n🔧 Go to: ${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/amonwicqzmmpzybnzthp/sql')}/new`)
  }
}

applyMigration()