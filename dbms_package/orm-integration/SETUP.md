# Add a demonstrable Prisma ORM path to ChapterOne

The current application mostly accesses PostgreSQL through `@supabase/supabase-js`; having a `prisma/schema.prisma` file alone does not satisfy the ORM requirement. This integration snippet is a server-side example using the existing `Book` model fields (`id`, `title`, `page_count`, `external_id`).

## 1. Install the ORM packages in the ChapterOne repository

```bash
npm install @prisma/client
npm install --save-dev prisma
```

## 2. Configure the database URL

Set `DATABASE_URL` in `.env.local` to a server-only PostgreSQL connection string supported by your Supabase project. Use the provider's recommended pooled connection for serverless requests where appropriate. Do not prefix it with `NEXT_PUBLIC_` and never put it in client-side code.

## 3. Validate the actual schema before Prisma migration use

The repository's current Prisma schema is abbreviated relative to the live `books` table. Make a backup first, then introspect the actual live database:

```bash
npx prisma validate
# Only after DATABASE_URL points to the intended database and the backup is complete:
npx prisma db pull
npx prisma generate
```

`prisma db pull` updates `prisma/schema.prisma` to the database it connects to. Review the diff carefully. Never run `prisma migrate dev` or `prisma db push` against a live Supabase database as a classroom shortcut.

## 4. Copy the sample files

Copy `lib/prisma.ts` into the repository's `lib/` directory and `app/api/dbms/books/route.ts` into `app/api/dbms/books/route.ts`. The handler assumes your generated client exposes the model as `prisma.book`, consistent with the repository's existing `model Book`. If introspection renames it or field names differ, update the handler to the generated model names.

## 5. Test

Start the app and visit `/api/dbms/books?page=1&pageSize=10`; test search with `/api/dbms/books?query=python`. Capture a timestamped screenshot and inspect the JSON response. Also run `npm run lint`, `npm test`, `npx prisma validate`, and `npm run build` after integration.

This is a prepared integration snippet, not a claim that the ORM has already been installed or executed in your live repository. The assessment expects ORM-backed database interaction where applicable; gradually migrate suitable server-side operations from the Supabase client to Prisma while retaining Supabase Auth and its RLS-aware session client for authentication-sensitive operations.
