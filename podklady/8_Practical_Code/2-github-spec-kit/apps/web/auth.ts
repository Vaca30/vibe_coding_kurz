import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDb } from '@imagineer/db';
import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';

// Magic-link only auth. Auth.js v5 with Resend provider. Drizzle adapter is
// pointed at our existing Postgres so we don't run a parallel auth schema —
// the adapter expects `users`, `accounts`, `sessions`, `verification_tokens`
// tables with its conventional shape; the migration that creates them is
// generated alongside our app schema.
//
// The adapter inspects its argument's shape to detect the dialect, so we pass
// the resolved Drizzle instance directly (not the lazy Proxy from
// `@imagineer/db`'s `db` export).

export const { auth, handlers, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb()),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM ?? 'noreply@imagineer.example.com',
    }),
  ],
  pages: { signIn: '/sign-in' },
  session: { strategy: 'database' as const },
}));
