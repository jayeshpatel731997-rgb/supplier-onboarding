# Supplier Onboarding Portal

A Next.js 14 SaaS app for procurement teams: buyers invite suppliers by secure magic link, suppliers submit business/contact/banking details and PDF documents, Claude extracts document expiry dates, and buyers track completion with reminders and Stripe billing.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase Auth, Postgres, Row Level Security, Storage
- Anthropic Claude `claude-sonnet-4-6` for PDF expiry extraction
- Resend for HTML email delivery
- Stripe Checkout subscriptions for the Pro plan
- Vercel cron for daily reminder automation

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill every value.

3. Create a Supabase project, then run the SQL in `supabase/migrations/001_supplier_onboarding.sql` in the Supabase SQL editor or through the Supabase CLI.

4. In Supabase Auth settings, add:

   ```text
   http://localhost:3000/auth/callback
   https://your-vercel-domain.vercel.app/auth/callback
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Environment Variables

`NEXT_PUBLIC_SUPABASE_URL`
Supabase Project Settings -> API -> Project URL.

`NEXT_PUBLIC_SUPABASE_ANON_KEY`
Supabase Project Settings -> API -> anon public key.

`SUPABASE_SERVICE_ROLE_KEY`
Supabase Project Settings -> API -> service role key. Keep server-only.

`ANTHROPIC_API_KEY`
Create an API key in the Anthropic Console. Used for Claude PDF extraction.

`RESEND_API_KEY`
Create an API key in Resend. For production, verify your sending domain and replace the `from` address in `src/lib/resend.ts`.

`NEXT_PUBLIC_APP_URL`
Local: `http://localhost:3000`. Production: your Vercel URL or custom domain.

`STRIPE_SECRET_KEY`
Stripe Developers -> API keys -> secret key.

`STRIPE_WEBHOOK_SECRET`
Stripe Developers -> Webhooks -> endpoint signing secret for `/api/webhooks/stripe`.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
Stripe Developers -> API keys -> publishable key. Documented for client-side billing expansion.

`STRIPE_PRO_PRICE_ID`
Stripe Product Catalog -> Pro subscription recurring price id for `$199/month`.

`CRON_SECRET`
A long random secret. Vercel Cron sends it as a bearer token when configured.

## Supabase Storage

The migration creates:

- `supplier-documents`: private PDF bucket, 10MB file limit
- `buyer-logos`: public logo bucket, 2MB file limit

Supplier documents are uploaded by token-backed API routes using the service role key, then buyers download through signed URLs.

## Stripe Setup

1. Create a product named `Supplier Onboarding Pro`.
2. Add a recurring monthly price of `$199`.
3. Put that price id in `STRIPE_PRO_PRICE_ID`.
4. Add a webhook endpoint:

   ```text
   https://your-domain.com/api/webhooks/stripe
   ```

5. Subscribe to:

   ```text
   checkout.session.completed
   customer.subscription.updated
   customer.subscription.deleted
   customer.subscription.paused
   ```

## Vercel

Add all env vars in Vercel Project Settings. The included `vercel.json` runs `/api/cron` daily at `13:00 UTC`.

Deploy with:

```bash
vercel --prod
```

## Verification Commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Product Behavior

- Free plan: up to 5 suppliers, manual reminders, no AI document extraction.
- Pro plan: unlimited suppliers, Claude expiry extraction, automated onboarding reminders, automated expiry reminders.
- Supplier links expire based on `buyer_settings.onboarding_deadline_days`.
- Expiry status is red under 30 days, yellow under 90 days.
