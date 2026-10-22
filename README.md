# AI-Powered Book Discovery Platform 📚✨

An intelligent, next-generation book recommendation and discovery platform. Instead of relying purely on titles and authors, this platform allows users to search for books by "vibes," atmospheric descriptions, and specific plot constraints.

Built with **Next.js**, **Supabase**, and a custom **Agentic RAG pipeline**.

##  Features

* **AI "Vibe" Finder**: Describe the exact book you want (e.g., *"A dark, atmospheric sci-fi with no romance"*). An LLM Agent normalizes your request, and the system uses vector embeddings to find perfect semantic matches.
* **Just-In-Time (JIT) Expansion**: If the AI determines the perfect book doesn't exist in your local database, it dynamically scrapes external APIs (Apple Books & Wikipedia) to fetch the metadata and injects it into the database on the fly.
* **Resilient AI Pipeline**: Features a resilient fallback system. It attempts to use Groq (Llama 3) for high-speed inference, automatically falling back to Google Gemini, and then OpenAI (GPT-4o-mini) to ensure 100% uptime.
* **Vector Semantic Search**: Integrated with PostgreSQL's `pgvector` for deep mathematical embedding similarity scoring.
* **Dynamic Real-Time Catalog**: Search results seamlessly blend local database matches with real-time fetches from OpenLibrary and Google Books APIs, ensuring an infinite catalog without heavy upfront bulk scraping.
* **Fiction Finder**: A fast, deterministic 2-step UI wizard for filtering the database by precise genres and book length.

## 🛠️ Tech Stack

* **Frontend**: Next.js (App Router), React, Tailwind CSS, TypeScript
* **Backend**: Next.js Route Handlers, Node.js
* **Database**: Supabase (PostgreSQL + `pgvector`)
* **AI Providers**: Groq (Llama 3.3), Google Gemini (`gemini-embedding-001`, `gemini-1.5-pro`), OpenAI (`gpt-4o-mini`)
* **External Integrations**: OpenLibrary API, Google Books API, Apple Books API, Wikipedia API

## 🚦 Getting Started

First, install the dependencies:

```bash
npm install
```

Configure your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_server_only_supabase_secret_key
# Legacy Supabase projects may temporarily use SUPABASE_SERVICE_ROLE_KEY instead.
DATABASE_URL=your_server_side_postgres_connection_string
CRON_SECRET=your_long_random_cron_secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI Keys
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

`DATABASE_URL`, `SUPABASE_SECRET_KEY` (or legacy service-role key), `CRON_SECRET`, and AI provider keys must remain server-side. Do not commit `.env.local`, database dumps, or backup archives. Copy `.env.example` for the variable names only; never replace it with actual credentials. The Prisma endpoint is `GET /api/dbms-demo?page=1&limit=10&q=...&sort=title`; it demonstrates search, filtering, joins, pagination, counts and a consistent transaction. `GET /api/dbms-demo/reviews` and its POST/PATCH/DELETE methods demonstrate authenticated, owner-scoped review CRUD.

The Admin dashboard and catalog maintenance endpoints require a signed-in account whose `public.users.role` is `Admin`. Ordinary users cannot assign their own role. `supabase/migrations/zzz_dbms_hardening.sql` is a prepared migration that has not been applied to the hosted database. Back up first, review `supabase/tests/dbms_preflight.sql`, resolve its findings, then apply and run `supabase/tests/dbms_acceptance_checks.sql` in a controlled target. Do not represent source files as live database evidence.

## DBMS assessment validation

```bash
npm run typecheck
npx prisma validate
npm test
npm run lint
npm run test:security # requires the app running locally
```

The local security smoke checks reject non-local `APP_BASE_URL` values. SQL, database restore, hosted CI, deployment and custom-domain evidence must be collected in the intended environments; repository configuration alone does not prove those tasks passed.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧠 Architecture Highlights

1. **Input Normalization Agent**: When a user inputs a messy query, the Normalizer LLM extracts clean vector search strings, hard genre filters, threat tags, and exclusions to prevent hallucinations.
2. **Hybrid Filtering**: Results are retrieved using vector similarity (`match_books` RPC), then passed through hard filters (genre requirements, keyword exclusions) before being returned.
3. **Dynamic Honest Rationales**: The AI generates a personalized, 1-sentence explanation of *why* each book fits the user's prompt based on concrete plot points.

## 📄 License

This project is open-source and available under the MIT License.
