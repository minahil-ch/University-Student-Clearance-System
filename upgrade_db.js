const { Client } = require('pg');

async function upgradeFutureData() {
  const client = new Client({
    connectionString: "postgresql://postgres.owmaqahzvmoofvbvpdmz:m!n@h!lch123@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    
    // Add status and remarks to future_data
    await client.query(`
      ALTER TABLE public.future_data 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS admin_remarks text;
    `);

    console.log("future_data table upgraded with status and remarks columns.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

upgradeFutureData();
