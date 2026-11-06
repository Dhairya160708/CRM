# CRM

A full-stack CRM web application built with Next.js, Prisma and Tailwind CSS.

**Live demo:** https://medtrade-crm.vercel.app

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Database / ORM | Prisma |
| Auth | NextAuth.js with bcrypt password hashing |
| UI | Tailwind CSS, Radix UI primitives, Lucide icons |
| Charts | Recharts |
| State / validation | Zustand, Zod |
| Hosting | Vercel |

## Getting started

Requirements: Node.js 18+ and a database supported by Prisma.

1. Clone the repo and install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the values.
3. Set up the database: `npm run db:push`
4. Optionally seed sample data: `npm run db:seed`
5. Start the dev server: `npm run dev` and open http://localhost:3000

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Run migrations and create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:studio` | Open Prisma Studio to browse the data |

## Project structure

- `src/` - application code (routes, components, utilities)
- `prisma/` - database schema, migrations and seed script
