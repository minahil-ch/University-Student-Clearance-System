const { Client } = require('pg');

async function updateRLS() {
  const client = new Client({
    connectionString: "postgresql://postgres.owmaqahzvmoofvbvpdmz:m!n@h!lch123@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    // Allow staff to see future_data
    await client.query("DROP POLICY IF EXISTS future_data_select_staff ON public.future_data");
    await client.query("CREATE POLICY future_data_select_staff ON public.future_data FOR SELECT TO authenticated USING (true)");
    console.log("RLS Policy for future_data updated successfully");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateRLS();
