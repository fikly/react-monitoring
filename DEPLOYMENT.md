# Web Monitor — Deployment Guide

## Architecture Overview

```
                    ┌──────────────────┐
                    │   Your App       │
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

| Component | Platform | Description |
|-----------|----------|-------------|
| Dashboard | Vercel | Static React app (Vite build) |
| API Routes | Vercel Serverless Functions | Event ingestion + query endpoints |
| Database | Supabase | PostgreSQL with auto-scaling |

---

## 1. Supabase Setup

### 1a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Service Role Key** from Settings → API

### 1b. Run Database Migrations

Open the **SQL Editor** in your Supabase dashboard and run each migration file in order:

```
packages/server/src/db/migrations/001_create_apps.sql
packages/server/src/db/migrations/002_create_events.sql
packages/server/src/db/migrations/003_create_sessions.sql
packages/server/src/db/migrations/004_create_metrics.sql
packages/server/src/db/migrations/005_create_indexes.sql
packages/server/src/db/migrations/006_create_rpc_functions.sql
```

Or print them all at once:

```bash
npm run migrate -w packages/server
```

This prints the SQL — copy and paste into the Supabase SQL Editor.

### 1c. Tables Created

| Table | Purpose |
|-------|---------|
| `apps` | Registered applications |
| `events` | Raw events from SDK |
| `sessions` | User session metadata |
| `metrics_hourly` | Pre-aggregated hourly metrics |
| `metrics_daily` | Pre-aggregated daily metrics |

---

## 2. Vercel Deployment

### 2a. Connect to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
cd web-monitor
vercel link
```

### 2b. Set Environment Variables

In the Vercel dashboard (Settings → Environment Variables), add:

| Variable | Value | Required |
|----------|-------|----------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Yes |
| `CORS_ORIGIN` | `*` or your app domain(s) | Yes |
| `VITE_APP_ID` | `my-app` | Optional |
| `VITE_API_BASE` | `/api/v1` | Optional |

### 2c. Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy preview
vercel
```

Vercel will:
1. Build the shared package and dashboard (static files)
2. Deploy API routes as serverless functions
3. Serve the dashboard with SPA routing

### 2d. Verify

```bash
# Health check
curl https://your-app.vercel.app/api/v1/health

# Expected: {"status":"healthy","timestamp":"...","services":{"database":"connected"}}
```

---

## 3. SDK Installation

### 3a. Build the SDK

```bash
cd web-monitor
npm install
npm run build:shared
npm run build:sdk
```

### 3b. Install in Your App

```bash
# Option 1: npm pack (tarball)
cd packages/shared && npm pack && mv *.tgz /tmp/
cd ../sdk && npm pack && mv *.tgz /tmp/

# In your app:
npm install /tmp/web-monitor-shared-1.0.0.tgz
npm install /tmp/web-monitor-sdk-1.0.0.tgz
```

### 3c. Initialize

```tsx
// src/index.tsx — before ReactDOM.createRoot()
import { MonitorClient } from '@web-monitor/sdk';
import { MonitorProvider, MonitorErrorBoundary } from '@web-monitor/sdk/react';

const monitor = MonitorClient.init({
  appId: 'my-app',
  endpoint: 'https://your-app.vercel.app/api/v1/events/batch',
  debug: process.env.NODE_ENV !== 'production',
});

// Optional: track API calls
import Http from './Http/Request'; // your Axios instance
monitor.trackAxios(Http);
```

Wrap your app:

```tsx
root.render(
  <React.StrictMode>
    <MonitorErrorBoundary monitor={monitor}>
      <MonitorProvider monitor={monitor}>
        <RouterProvider router={Router} />
      </MonitorProvider>
    </MonitorErrorBoundary>
  </React.StrictMode>
);
```

### 3d. Identify Users (Optional)

```tsx
import { MonitorClient } from '@web-monitor/sdk';

useEffect(() => {
  if (userProfile?.id) {
    MonitorClient.getInstance()?.identify(userProfile.id, {
      email: userProfile.email ?? '',
    });
  }
}, [userProfile]);
```

### 3e. Custom Event Tracking

```tsx
// Zero-code: data-track attributes
<Button data-track="approve-request">Approve</Button>

// Programmatic:
import { useTrackFeature } from '@web-monitor/sdk/react';

function MyComponent() {
  const trackFeature = useTrackFeature();
  const handleExport = () => {
    trackFeature('export-report', { format: 'xlsx' });
  };
}
```

---

## 4. What Gets Tracked Automatically

| Event | How | Details |
|-------|-----|---------|
| **Page Views** | `pushState/replaceState + hashchange` | Path, title, duration |
| **JS Errors** | `window.onerror + unhandledrejection` | Message, stack trace |
| **React Errors** | `MonitorErrorBoundary` | Component stack |
| **API Calls** | Axios interceptors | URL, method, status, duration |
| **Performance** | Web Vitals | FCP, LCP, CLS, FID, TTFB, INP |
| **Clicks** | Event delegation | Button text, data-track value |

Events are batched (20 per batch or every 10s) and sent via `fetch`. On page unload, remaining events are flushed via `sendBeacon`.

---

## 5. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/events/batch` | POST | SDK sends events here |
| `/api/v1/d/page-views` | GET | Page view analytics |
| `/api/v1/d/errors` | GET | Error analytics |
| `/api/v1/d/performance` | GET | Performance metrics |
| `/api/v1/d/api-calls` | GET | API call analytics |
| `/api/v1/d/sessions` | GET | Session analytics |
| `/api/v1/d/feature-usage` | GET | Feature usage |
| `/api/v1/d/records` | GET | Raw events |
| `/api/v1/d/aggregate` | POST | Manual aggregation trigger |

---

## 6. Local Development

```bash
# Install dependencies
npm install

# Run dashboard (port 3200)
npm run dev:dashboard

# Run server locally (port 3100) — requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in packages/server/.env
npm run dev:server

# Or use Vercel CLI for full local setup
vercel dev
```

---

## 7. Deployment Checklist

```
Supabase
□ 1. Supabase project created
□ 2. All 6 migration SQL files executed in SQL Editor
□ 3. Project URL and Service Role Key noted

Vercel
□ 4. Repository connected to Vercel
□ 5. Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN)
□ 6. Deployed to production
□ 7. Health check passes

SDK Integration
□ 8. SDK built and installed in your app
□ 9. MonitorClient.init() called before React renders
□ 10. App wrapped with MonitorErrorBoundary + MonitorProvider
□ 11. Events visible in dashboard after usage
```
