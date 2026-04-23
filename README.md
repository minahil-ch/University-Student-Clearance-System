# University Student Clearance Management System

Multi-portal clearance platform with Student, Admin, Library, Transport, Finance, Hostel, and Academic dashboards.

## Stack

- Next.js App Router + Tailwind CSS
- Supabase (Auth, Postgres, Realtime)
- Google Apps Script (Google Sheets + email notifications)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GAS_WEBHOOK_URL=
NEXT_PUBLIC_GAS_SECRET_TOKEN=SECURE_KEY_123
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

3. Run SQL in Supabase SQL Editor:
- `supabase_schema.sql`

4. Deploy Apps Script:
- Paste `google-apps-script.gs` into your Apps Script project
- Deploy as Web App
- Put deployed URL into `NEXT_PUBLIC_GAS_WEBHOOK_URL`

5. Run app:

```bash
npm run dev
```

Open `http://localhost:3000`.
