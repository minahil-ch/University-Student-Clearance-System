const { Client } = require('pg');

async function runSQL() {
  const client = new Client({
    user: 'postgres.owmaqahzvmoofvbvpdmz',
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    database: 'postgres',
    password: 'm!n@h!lch123',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase!");
    
    // Create department_forms table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.department_forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          department_key TEXT NOT NULL,
          form_name TEXT NOT NULL,
          form_link TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.department_forms ENABLE ROW LEVEL SECURITY;

      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read' AND tablename = 'department_forms') THEN
              CREATE POLICY "Allow public read" ON public.department_forms FOR SELECT USING (true);
          END IF;
      END $$;

      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow staff manage' AND tablename = 'department_forms') THEN
              CREATE POLICY "Allow staff manage" ON public.department_forms FOR ALL USING (auth.role() = 'authenticated');
          END IF;
      END $$;
    `);

    console.log("department_forms table created and secured successfully.");
  } catch (err) {
    console.error("SQL Execution Error:", err);
  } finally {
    await client.end();
  }
}

runSQL();
