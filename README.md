# BREB Meter Dashboard

A Vite + React + TypeScript dashboard for viewing BREB prepaid electricity meter statistics and recharge history.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## API Proxy

The app calls the BREB API through a relative `/api` path:

```text
/api/breb-customer/cust/*
```

In local development, the Vite dev proxy forwards those requests. In Vercel,
`vercel.json` applies the same rewrite in production. Both point to:

```text
https://api.brebprepaidportal.com
```

Add additional meters in `src/constants/meters.ts`.
