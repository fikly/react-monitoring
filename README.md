# Web Monitor

A full-stack web analytics and monitoring platform for React applications. Track page views, errors, API calls, performance metrics, and custom events with a lightweight SDK and a real-time dashboard.

## Architecture

```
┌──────────────────┐
│   Your React App │
│  @web-monitor/sdk│
└────────┬─────────┘
         │ POST /api/v1/events/batch
         ▼
┌──────────────────┐
│   Vercel         │  ← Serverless API + Dashboard
│   (API Routes)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Supabase       │  ← PostgreSQL + Auth
└──────────────────┘
```

## Packages

This is a monorepo using npm workspaces:

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared types and utilities |
| `packages/sdk` | Client SDK for React apps (hooks, providers, error boundary) |
| `packages/dashboard` | React dashboard (Vite + Ant Design + Recharts) |
| `api/` | Vercel serverless API routes (auth, event ingestion, queries) |
| `db/migrations/` | SQL migration files for Supabase |

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run each migration file in `db/migrations/` in order via the Supabase SQL Editor:
   - `001_create_apps.sql` - Apps table
   - `002_create_events.sql` - Events table
   - `003_create_sessions.sql` - Sessions table
   - `005_create_indexes.sql` - Database indexes
   - `006_create_rpc_functions.sql` - Analytics RPC functions
   - `007_create_organizations.sql` - Organizations and org_members tables
   - `008_add_org_to_apps.sql` - Link apps to organizations
   - `009_create_user_profiles.sql` - User profiles with auto-creation trigger
3. Copy your project URL and keys from Supabase Settings > API

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```bash
# Supabase (API - server side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Supabase (Dashboard - client side, used by Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Local development: point dashboard at local API
VITE_API_BASE=http://localhost:3000/api/v1

# CORS
CORS_ORIGIN=*
```

### 4. Run locally

```bash
# Full local setup (API + dashboard on port 3000)
vercel dev

# Or run just the dashboard (port 3200, needs a running API)
npm run dev:dashboard
```

`vercel dev` serves both the API routes and the dashboard on `http://localhost:3000`.

### 5. Build

```bash
npm run build
```

## Deployment

### Vercel

1. Link your repo to Vercel: `vercel link`
2. Add environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `CORS_ORIGIN` (set to your domain, or `*`)
3. Deploy: `vercel --prod`

The dashboard is served as static files and the API routes run as serverless functions.

## Multi-Tenant Auth

The platform uses Supabase Auth with a multi-tenant organization model:

- **Organizations** group users and apps together
- **Members** belong to organizations with roles: `owner`, `admin`, `member`
- **Apps** are scoped to an organization
- **Superadmins** can access all organizations and apps

### Dashboard Settings

| Tab | Features |
|-----|----------|
| Organizations | Create, edit, delete organizations |
| Apps | Create apps, view API keys |
| Members | Invite members, assign to other orgs, remove members |

## SDK Usage

### Initialize

```tsx
import { MonitorClient } from '@web-monitor/sdk';
import { MonitorProvider, MonitorErrorBoundary } from '@web-monitor/sdk/react';

const monitor = MonitorClient.init({
  appId: 'my-app',
  endpoint: 'https://your-app.vercel.app/api/v1/events/batch',
});

root.render(
  <MonitorErrorBoundary monitor={monitor}>
    <MonitorProvider monitor={monitor}>
      <App />
    </MonitorProvider>
  </MonitorErrorBoundary>
);
```

### Track Events

```tsx
// Zero-code: data-track attributes
<Button data-track="approve-request">Approve</Button>

// Programmatic:
import { useTrackFeature } from '@web-monitor/sdk/react';

function MyComponent() {
  const trackFeature = useTrackFeature();
  trackFeature('export-report', { format: 'xlsx' });
}
```

### Identify Users

```tsx
MonitorClient.getInstance()?.identify(userId, { email });
```

## What Gets Tracked

| Event | Method | Details |
|-------|--------|---------|
| Page Views | `pushState` / `hashchange` | Path, title, duration |
| JS Errors | `window.onerror` | Message, stack trace |
| React Errors | `MonitorErrorBoundary` | Component stack |
| API Calls | Axios interceptors | URL, method, status, duration |
| Performance | Web Vitals | FCP, LCP, CLS, FID, TTFB, INP |
| Clicks | Event delegation | Button text, `data-track` value |

Events are batched (20 per batch or every 10s) and flushed via `sendBeacon` on page unload.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/events/batch` | POST | Event ingestion (SDK) |
| `/api/v1/auth/me` | GET | Current user profile, orgs, apps |
| `/api/v1/d/apps` | GET/POST | List/create apps |
| `/api/v1/d/members` | GET/POST/PUT/DELETE | Org CRUD + member management |
| `/api/v1/d/page-views` | GET | Page view analytics |
| `/api/v1/d/errors` | GET | Error analytics |
| `/api/v1/d/performance` | GET | Performance metrics |
| `/api/v1/d/api-calls` | GET | API call analytics |
| `/api/v1/d/sessions` | GET | Session analytics |
| `/api/v1/d/feature-usage` | GET | Feature usage |
| `/api/v1/d/records` | GET | Raw events |

## Tech Stack

- **SDK**: TypeScript, React hooks, Web Vitals, Axios interceptors
- **API**: Vercel serverless functions, Supabase, Zod
- **Dashboard**: React 18, Vite, Ant Design, Recharts, TanStack Query
- **Auth**: Supabase Auth, JWT, multi-tenant organizations
- **Deployment**: Vercel (serverless functions + static hosting)
