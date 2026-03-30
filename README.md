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
│   Supabase       │  ← PostgreSQL Database
└──────────────────┘
```

## Packages

This is a monorepo using npm workspaces:

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared types and utilities |
| `packages/sdk` | Client SDK for React apps (hooks, providers, error boundary) |
| `packages/dashboard` | React dashboard (Vite + Ant Design + Recharts) |
| `api/` | Vercel serverless API routes (event ingestion, queries) |
| `db/migrations/` | SQL migration files for Supabase |

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (PostgreSQL)

### Install

```bash
npm install
```

### Local Development

```bash
# Run the dashboard (port 3200)
npm run dev:dashboard

# Run full local setup (API + dashboard)
vercel dev
```

### Build

```bash
npm run build
```

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
| `/api/v1/events/batch` | POST | Event ingestion |
| `/api/v1/d/page-views` | GET | Page view analytics |
| `/api/v1/d/errors` | GET | Error analytics |
| `/api/v1/d/performance` | GET | Performance metrics |
| `/api/v1/d/api-calls` | GET | API call analytics |
| `/api/v1/d/sessions` | GET | Session analytics |
| `/api/v1/d/feature-usage` | GET | Feature usage |
| `/api/v1/d/records` | GET | Raw events |

## Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=*

# Optional (dashboard)
VITE_APP_ID=my-app
VITE_API_BASE=/api/v1
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full Supabase setup, Vercel deployment, and SDK integration instructions.

## Tech Stack

- **SDK**: TypeScript, React hooks, Web Vitals, Axios interceptors
- **API**: Vercel serverless functions, Supabase, Zod
- **Dashboard**: React 18, Vite, Ant Design, Recharts, TanStack Query
- **Deployment**: Vercel (serverless functions + static hosting)
