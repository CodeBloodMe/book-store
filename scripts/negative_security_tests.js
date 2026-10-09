// ======================================================================================
// DBMS Lab Phase 6: Negative Security Tests (RBAC & RLS)
// (Prepared for submission; easily removable)
// ======================================================================================
// This script conceptually demonstrates how to test the Row Level Security (RLS) 
// and Role-Based Access Control (RBAC) implemented in the database.

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runNegativeTests() {
  console.log("Starting Security Negative Tests...\n");

  // TEST 1: Unauthorized User attempting to delete a review (Should Fail)
  console.log("Test 1: Normal User attempting to delete a review...");
  
  // We mock a login of a user with role = 'User' (Not 'Admin')
  await supabase.auth.signInWithPassword({
    email: 'normal.user@example.com',
    password: 'securepassword123'
  });

  const { error: deleteError } = await supabase
    .from('reviews')
    .delete()
    .eq('rating', 1);

  if (deleteError) {
    console.log("✅ SUCCESS: Delete operation blocked by RLS. (Expected failure)");
    console.log(`   Reason: ${deleteError.message}`);
  } else {
    console.error("❌ FAILED: Delete operation succeeded! RLS policy is misconfigured.");
  }

  // TEST 2: SQL Injection Attempt via ORM/SDK (Should Fail / Be escaped)
  console.log("\nTest 2: SQL Injection attempt in search field...");
  
  const maliciousInput = "'; DROP TABLE users; --";
  
  const { data, error: sqliError } = await supabase
    .from('books')
    .select('*')
    .eq('title', maliciousInput);

  if (sqliError) {
    console.log("✅ SUCCESS: Query blocked or safely escaped.");
  } else if (data.length === 0) {
    console.log("✅ SUCCESS: Input was safely escaped. No tables dropped, no data returned.");
  } else {
    console.error("❌ FAILED: Query returned unexpected data. Potential vulnerability.");
  }

  // Logout
  await supabase.auth.signOut();
}

// runNegativeTests(); // Uncomment to execute in a valid test environment
