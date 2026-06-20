# Referral Dashboard

Go Business referral dashboard built with React, Vite, and React Router.

## Features

- Secure login with JWT cookie storage
- Protected dashboard and referral detail routes
- Search, sort, and client-side pagination for referrals
- Copyable referral link and code
- Public 404 page and Vercel SPA routing support

## Tech Stack

- React 18
- Vite
- React Router DOM
- js-cookie

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment Notes

- The app uses client-side routing.
- `vercel.json` rewrites every route to `index.html` so pages like `/login` and `/referral/:id` work after refresh or logout on Vercel.

## Project Structure

- `src/App.jsx` - routes, pages, and data flow
- `src/api.js` - API helpers
- `src/styles.css` - application styling
- `vercel.json` - Vercel SPA routing config

## Credentials

- Email: `admin@example.com`
- Password: `admin123`
