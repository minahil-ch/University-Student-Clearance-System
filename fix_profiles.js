const { Client } = require('pg');

async function fixProfilesTable() {
  const client = new Client({
    connectionString: "postgresql://postgres.owmaqahzvmoofvbvpdmz:m!n@h!lch123@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    
    console.log("Connected to database. Adding missing columns...");
    
    // Add missing columns to profiles
    await client.query(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS session TEXT,
      ADD COLUMN IF NOT EXISTS father_name TEXT,
      ADD COLUMN IF NOT EXISTS cgpa TEXT;
    `);

    console.log("Profiles table successfully upgraded with session, father_name, and cgpa columns.");
  } catch (err) {
    console.error("Error upgrading profiles table:", err);
  } finally {
    await client.end();
  }
}

fixProfilesTable();
