# Creator Engine

Sistema operacional para criacao e gestao de personas digitais (Instagram, TikTok, YouTube, FanVue).
PersonaForge e o modulo interno de gestao de cada persona. Servido sob `/creator-engine`.

## Stack
- Next.js 16 (App Router)
- PostgreSQL + Prisma ORM
- NextAuth v5 (JWT + Credentials)
- Tailwind CSS v4

## Setup

1. npm install
2. cp .env.example .env.local  (preencher DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY)
3. npm run db:push
4. npm run db:generate
5. npm run db:seed
6. npm run dev

Login inicial: admin@creator-engine.local / creatorengine123

App local: http://localhost:3000/creator-engine (use `BASE_PATH=""` para rodar na raiz).
