# Libres Cobros

A club fee management system built for Argentine sports and social clubs. Administrators manage members, generate monthly fees, track payments, and run commission reports. Members look up their dues by DNI and pay online via Stripe, MercadoPago, or bank transfer.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM v7](https://prisma.io)
- **Auth**: [NextAuth.js](https://next-auth.js.org) (credentials strategy for administrators)
- **Payments**: Stripe, MercadoPago, bank transfer
- **Notifications**: WhatsApp Business (Meta Cloud API)
- **Styling**: Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)
- **Deploy target**: Vercel

## Features

- **Member registry** with category-based fees (`ADULT`, `FAMILY`, `MINOR`)
- **Monthly fee generation** with idempotent creation per member and period
- **Payment processing** through Stripe Checkout, MercadoPago preference, or manual bank transfer confirmation
- **Member portal** (`/pagos`) — DNI lookup, fee list, payment method selection, and confirmation screen
- **Admin dashboard** with metrics, member management, fee tracking, payment history, and reports
- **Commission system** that snapshots the configured rate on every confirmed payment and supports monthly closings
- **WhatsApp reminders** for pending/overdue fees using Meta Cloud API message templates
- **Excel export** for members, debts, payments, and commissions
- **Vercel Cron Jobs** for automatic fee generation and overdue marking

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local, Vercel Postgres, Supabase, etc.)
- npm, yarn, pnpm, or bun

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/libres_cobros?schema=public

# Auth
NEXTAUTH_SECRET=your-random-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_CLIENT_SECRET=...
MERCADOPAGO_PUBLIC_KEY=TEST-...

# WhatsApp (Meta Cloud API)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_TEMPLATE_NAME=payment_reminder

# Vercel Cron
CRON_SECRET=a-random-secret-for-cron-endpoints

# Public URL used for callbacks and redirects
NEXT_PUBLIC_URL=http://localhost:3000
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

3. Run migrations:

   ```bash
   npm run db:migrate
   ```

4. Seed the database (creates the initial admin user, default fee categories, and empty site config keys):

   ```bash
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The root path redirects members to `/pagos`. Administrators can sign in at `/admin/login`.

### Default Admin User

The seed script creates one administrator:

- Email: `admin@libres.com`
- Password: `admin123`

Change this password immediately after the first login.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with Turbopack |
| `npm run build` | Create an optimized production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations in development |
| `npm run db:seed` | Run the database seed script |
| `npm run db:studio` | Open Prisma Studio |

## Deploy to Vercel

1. Push the repository to GitHub and import it into [Vercel](https://vercel.com).
2. Add all environment variables listed above in the Vercel project settings.
3. Use the included `vercel-build` script as the build command:

   ```bash
   prisma generate && prisma migrate deploy && next build
   ```

   This applies pending migrations during the build.

4. The `vercel.json` file registers two cron jobs:

   | Path | Schedule | Description |
   |------|----------|-------------|
   | `/api/cron/overdue` | `0 6 * * *` | Mark pending fees with past due dates as `OVERDUE` |
   | `/api/cron/fees` | `0 6 1 * *` | Generate monthly fees for active members on the 1st of each month |

   Cron endpoints require the `Authorization` header with the value of `CRON_SECRET`.

5. Configure provider webhooks:
   - Stripe webhook endpoint: `/api/webhooks/stripe` → listen to `checkout.session.completed`
   - MercadoPago webhook endpoint: `/api/webhooks/mercadopago` → listen to payment notifications

6. After the first deploy, run the seed command once against the production database:

   ```bash
   npx prisma db seed
   ```

   Then open Prisma Studio (`npm run db:studio`) or query the database to verify the initial admin user and fee configs.

## Project Structure

```text
prisma/
  schema.prisma       # Database models
  seed.ts             # Initial data seed
src/
  app/
    admin/            # Admin dashboard pages
    pagos/            # Member portal pages
    api/              # API routes (admin, checkout, webhooks, cron)
  components/
    admin/            # Admin UI components
    member/           # Member portal components
    ui/               # shadcn/ui components
  lib/                # Business logic and provider wrappers
  types/              # Zod schemas and TypeScript types
```

## License

MIT
