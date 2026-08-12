This migration adds:

- A new Postgres enum type `ReviewStatus` with values ('pending','approved','rejected').
- A new `status` column on the `reviews` table (NOT NULL DEFAULT 'pending').
- A new `comparePrice` column on the `variants` table (DECIMAL(10,2)).

To apply locally, run from the `backend` folder:

```bash
# install deps if needed
npm install

# generate Prisma client (optional)
npx prisma generate

# Run the development migration (applies and creates a new migration entry)
npx prisma migrate dev --name add-variant-compare-and-review-status

# Or to apply SQL directly in production, use:
npx prisma migrate deploy
```

Note: The repository already contains an updated `schema.prisma` reflecting these changes. Running `npx prisma migrate dev` will reconcile the schema and create the proper migration history in your local DB. Do not commit the generated migration folders created by Prisma if you prefer to manage migrations centrally; however, if you're running migrations from CI/production, commit the generated migration files.
