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

The app calls the BREB API through the Vite dev proxy:

```text
/api/breb-customer/cust/*
```

The proxy forwards requests to:

```text
https://api.brebprepaidportal.com
```

Add additional meters in `src/constants/meters.ts`.
