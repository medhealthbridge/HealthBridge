# Next.js Fullstack Layered Architecture Guide

This document explains the fullstack architecture pattern used in this Next.js (App Router) application. Unlike a frontend-only setup, this project owns both the UI and the backend: Next.js Route Handlers (and optionally Server Actions) serve as the API layer, while TanStack Query manages all client-side server-state fetching, caching, and mutations.

## Architecture Overview

```
App Router (Pages/Layouts) → Components → Hooks (TanStack Query) → API Services → Route Handlers (app/api) → Data Layer (DB / External APIs)
```

Two request paths exist and are used deliberately:

- **Client-driven path** (most reads/writes after initial load): `Component → Hook (useQuery/useMutation) → API Service → fetch("/api/...") → Route Handler → DB`
- **Server-driven path** (first paint, SEO-sensitive pages): `Server Component → Data Layer directly (no HTTP round trip) → HydrationBoundary → Client picks up cache via TanStack Query`

The rule of thumb: **Server Components read data directly** (calling the data layer/DB in-process, no `fetch` to your own API needed) for the initial render, then **hand off to TanStack Query** on the client for anything interactive (refetching, pagination, mutations, optimistic updates).

## Layer Definitions

### 1. App Router Layer (`src/app/`)

**Purpose**: File-based routing, layouts, and the boundary between Server and Client Components.

**Responsibilities**:

- Define URL structure via folders (`app/dashboard/page.tsx`)
- Decide Server vs Client Component per file (`"use client"` directive)
- Prefetch and dehydrate initial query data in Server Components
- Compose page-level layout and metadata (`layout.tsx`, `metadata` export)
- Apply route protection via `middleware.ts`

**Example**: `src/app/dashboard/page.tsx` (Server Component prefetching for a Client Component tree)

```typescript
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/get-query-client";
import { userService } from "~/services/user.service";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["users", { page: 1 }],
    queryFn: () => userService.getUsers({ page: 1 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

```typescript
// src/app/dashboard/dashboard-client.tsx
"use client";

export function DashboardClient() {
  const { data: users } = useUsers({ page: 1 }); // hydrated instantly, no loading flash
  return <UserList users={users} />;
}
```

### 2. Components Layer (`src/components/`)

**Purpose**: Reusable UI components using Radix UI / shadcn/ui and Tailwind CSS. Same responsibilities as a frontend-only app.

**Responsibilities**:

- Render UI elements, handle interactions
- Manage local UI state only (open/closed, form inputs before submit)
- Consume hooks for all server state — never call `fetch` or a service directly

**Example**: `src/components/create-user-dialog.tsx`

```typescript
"use client";

export function CreateUserDialog() {
  const createUser = useCreateUser();
  const [open, setOpen] = useState(false);

  const handleSubmit = (data: CreateUserInput) => {
    createUser.mutate(data, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* form implementation */}
    </Dialog>
  );
}
```

### 3. Hooks Layer (`src/hooks/api/`)

**Purpose**: Identical role to a frontend-only setup — wrap API service calls with TanStack Query. This layer doesn't care whether the service hits your own Route Handlers or a third-party API.

**Directory Structure**:

- `src/hooks/api/use-auth.ts`
- `src/hooks/api/use-users.ts`
- `src/hooks/api/use-storage.ts`
- `src/hooks/` — reusable client-only hooks (debounce, media query, etc.)

**Example**: `src/hooks/api/use-users.ts`

```typescript
export function useUsers(params?: GetUsersParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.getUsers(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => userService.createUser(data),
    onSuccess: (updatedUser: User) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", updatedUser.id] });
      toast.success("User created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create user");
    },
  });
}
```

### 4. API Services Layer (`src/services/`)

**Purpose**: Client-side fetch wrappers that call your **own** Next.js Route Handlers (same origin, relative paths — no base URL/CORS config needed). This mirrors the frontend-only pattern but targets internal routes instead of an external API.

**Directory Structure**:

- `client.ts` — base `fetch` wrapper (JSON parsing, error normalization)
- `types.ts` — shared request/response types (can be imported by both client services and Route Handlers)
- `auth.service.ts`, `user.service.ts`, `storage.service.ts`

**Example**: `src/services/user.service.ts`

```typescript
export const userService = {
  getUsers: async (params?: GetUsersParams) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    return client.get<PaginatedResponse<User>>(`/api/users?${qs}`);
  },

  createUser: async (data: CreateUserInput) => {
    return client.post<User>("/api/users", data);
  },

  updateUser: async (userId: string, data: UpdateUserInput) => {
    return client.put<User>(`/api/users/${userId}`, data);
  },

  deleteUser: async (userId: string) => {
    return client.delete(`/api/users/${userId}`);
  },
};
```

### 5. Route Handlers (Backend Layer) (`src/app/api/`)

**Purpose**: This is the new layer that a frontend-only app doesn't have — it's the actual backend, colocated in the same Next.js project.

**Responsibilities**:

- Parse and validate incoming requests (e.g. with Zod)
- Enforce auth/session checks
- Call the data layer (DB queries via Drizzle/Prisma, or external services)
- Return typed JSON responses in a consistent envelope

**Example**: `src/app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { getSession } from "~/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);

  const users = await db.query.users.findMany({
    limit: 20,
    offset: (page - 1) * 20,
  });

  return NextResponse.json({ success: true, data: users, message: "OK" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  return NextResponse.json({ success: true, data: user, message: "User created" });
}
```

**Dynamic segment example**: `src/app/api/users/[id]/route.ts` handles `GET`, `PUT`, `DELETE` for a single user, receiving `{ params }: { params: { id: string } }`.

### 6. Data Layer (`src/lib/db/`)

**Purpose**: Direct database access, used by Route Handlers and by Server Components (for the initial-render path that skips HTTP entirely).

**Responsibilities**:

- Drizzle ORM (or Prisma) schema and query builders
- Migrations
- Never imported by client-side code — this layer only runs on the server

**Example**: `src/lib/db/queries/users.ts`

```typescript
export async function getUserById(id: string) {
  return db.query.users.findFirst({ where: eq(usersTable.id, id) });
}
```

A Server Component can call `getUserById` directly; a Route Handler calls it too. The client-side `userService` never touches this file.

## Data Flow Patterns

### Query Pattern (Client-Driven)

```
Component → Hook (useQuery) → Service → fetch("/api/...") → Route Handler → Data Layer
```

### Query Pattern (Server-Driven, first paint)

```
Server Component (page.tsx) → Data Layer directly → dehydrate() → HydrationBoundary → Client Component reads via useQuery (cache hit, no refetch)
```

### Mutation Pattern

```
Component → Hook (useMutation) → Service → fetch("/api/...", { method: "POST" }) → Route Handler → Data Layer → invalidateQueries()
```

### Server Actions (optional alternative to Route Handlers for mutations)

For forms that don't need optimistic UI or shared client cache logic, a Server Action can replace the Service + Route Handler pair:

```typescript
// src/app/actions/create-user.ts
"use server";

export async function createUserAction(data: CreateUserInput) {
  const parsed = createUserSchema.parse(data);
  const [user] = await db.insert(usersTable).values(parsed).returning();
  revalidatePath("/dashboard");
  return user;
}
```

**When to use which**:

- **Route Handler + TanStack Query mutation** — when the UI needs optimistic updates, loading/error state from `useMutation`, or the data also needs to be `useQuery`-cacheable elsewhere.
- **Server Action** — simple form submissions where a full-page `revalidatePath`/`redirect` is enough and no client-side cache juggling is needed.

This project defaults to **Route Handlers + TanStack Query** for consistency across all data operations, reserving Server Actions for simple, isolated forms.

### Authentication Flow

**Login Flow**:

1. User submits credentials on `/sign-in`
2. Component calls `useAuth().signIn()`
3. Hook calls `authService.signIn()` → `POST /api/auth/signin`
4. Route Handler validates credentials against the data layer, issues a session
5. Session token set as an **httpOnly cookie** (not `localStorage` — this is a key fullstack advantage: no XSS-exposed tokens, and the cookie is automatically sent on Server Component requests too)
6. `useAuth` cache updated, user redirected to `/dashboard`

**Session Validation**:

- `middleware.ts` checks the session cookie on protected routes before rendering
- Route Handlers re-validate the session server-side on each request via `getSession(req)`

**Example**: `src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("session_token");
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

## Service Modules

### Authentication Service (`auth.service.ts`)

- `signIn(credentials)`, `signUp(userData)`, `signOut()`
- `getCurrentUser()`, `resetPassword(email)`, `updatePassword(token, password)`
- `getOAuthUrl(provider)`, `handleOAuthCallback(code, state)`

### User Service (`user.service.ts`)

- `getUsers(params)`, `getUserById(userId)`, `createUser(data)`
- `updateUser(userId, data)`, `updateProfile(userId, bio)`, `deleteUser(userId)`
- `searchUsers(query)`, `updateAvatar(userId, file)`

### Storage Service (`storage.service.ts`)

- `getPresignedUploadUrl(key, contentType, expiresIn)`
- `uploadFile(file, onProgress)`, `getFileMetadata(key)`
- `getFiles(params)`, `getDownloadUrl(key, expiresIn)`, `deleteFile(key)`

## Best Practices

### When to Use Each Layer

- **App Router**: Routing, layouts, metadata, prefetch/dehydrate for first paint
- **Components**: UI rendering and local state only
- **Hooks**: All client-side server-state management via TanStack Query
- **Services**: fetch wrappers targeting internal `/api` routes
- **Route Handlers**: Request parsing/validation, auth checks, calling the data layer
- **Data Layer**: The only place that talks to the database

### Error Handling Guidelines

1. **Route Handlers**: Return consistent `{ success, data, message }` envelopes with proper HTTP status codes
2. **Services**: Throw on non-2xx responses so TanStack Query's `isError` works correctly
3. **Hooks**: Convert errors to user-friendly messages via toast in `onError`
4. **Components**: Display error states from hooks (`isError`, `error`)

### Caching Strategies

1. Set `staleTime` per query type; prefetch in Server Components for first-paint data
2. Invalidate query keys after mutations
3. Use `HydrationBoundary` to avoid a loading flash on initial load
4. Use optimistic updates for destructive/high-latency mutations

### Type Safety

1. Define shared request/response types in `src/services/types.ts` and reuse them in Route Handlers — avoids drift between frontend and backend since both live in the same project
2. Validate all Route Handler input with Zod (or similar) even though types are shared, since types don't validate at runtime
3. Type all hook parameters and component props

## API Contract Types

`src/services/types.ts` (shared by services and, where convenient, imported into Route Handlers):

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role: "super_admin" | "admin" | "guest";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: "super_admin" | "admin" | "guest";
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: "super_admin" | "admin" | "guest";
  status?: "active" | "suspended";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Deployment

Because this is a fullstack Next.js app (not static export), it needs a Node-capable host:

- **Vercel**: First-class support, zero-config
- **Cloudflare Pages / Workers**: Via `@opennextjs/cloudflare` adapter
- **AWS (via OpenNext / Amplify)**, **Railway**, **Render**: Standard Node.js hosting

Static-hosting-only platforms (GitHub Pages, plain S3+CloudFront) are **not** viable here since Route Handlers, middleware, and Server Components require a server runtime.

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET=""
AUTH_COOKIE_NAME="session_token"

# OAuth (optional)
OAUTH_CLIENT_ID=""
OAUTH_CLIENT_SECRET=""

# Storage (S3, R2, etc.)
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
```

Note there's no `NEXT_PUBLIC_API_BASE_URL` equivalent — Route Handlers are same-origin, so services call relative paths (`/api/users`) directly.

## Migration from Frontend-Only (TanStack Start Pattern)

If migrating from a frontend-only TanStack Start app consuming an external API:

### Key Changes

1. **Added Backend Layer**
   - New `src/app/api/**/route.ts` Route Handlers replace the external API
   - New `src/lib/db/` data layer (Drizzle/Prisma) replaces external API calls
   - Optional Server Actions for simple forms

2. **Services Layer Repointed**
   - `client.ts` now calls relative `/api/...` paths instead of an external `baseURL`
   - No CORS configuration needed (same origin)

3. **Auth Moved to Cookies**
   - Session stored as an httpOnly cookie instead of `localStorage`
   - `middleware.ts` added for route protection instead of client-side `beforeLoad` redirects
   - Route Handlers re-validate session server-side per request

4. **Hydration Added**
   - Server Components prefetch + `dehydrate()` for first-paint data
   - `HydrationBoundary` wraps Client Components to avoid loading flashes
   - Hooks layer (`src/hooks/api/`) is otherwise unchanged from the frontend-only pattern

### Migration Checklist

- [ ] Scaffold `src/app/api/` Route Handlers mirroring existing external endpoints
- [ ] Set up `src/lib/db/` with Drizzle/Prisma schema and migrations
- [ ] Update `client.ts` to use relative paths, remove `baseURL`/CORS config
- [ ] Move auth token storage from `localStorage` to httpOnly cookies
- [ ] Add `middleware.ts` for protected route redirects
- [ ] Add `getQueryClient()` helper and wire up `HydrationBoundary` on data-heavy pages
- [ ] Decide per-mutation: Route Handler + TanStack Query, or Server Action
- [ ] Test auth flows (sign in, sign up, sign out, refresh/session expiry)
- [ ] Test file upload/download via presigned URLs
- [ ] Test SSR/hydration (no mismatch warnings, no double-fetch on mount)

## Benefits of This Fullstack Architecture

1. **Single Deploy**: Frontend and backend ship together, no separate API deployment
2. **Shared Types**: Request/response types shared between client services and Route Handlers with zero duplication
3. **No CORS**: Same-origin API calls simplify auth and networking
4. **Better Auth Security**: httpOnly cookies avoid XSS token theft that `localStorage` is vulnerable to
5. **Faster First Paint**: Server Components fetch data in-process (no client round trip) and hydrate TanStack Query's cache
6. **Still Cacheable/Interactive**: TanStack Query still owns all post-load caching, refetching, and mutation UX exactly as it would in a frontend-only app
7. **Incremental**: Route Handlers can proxy to a legacy external API during migration, then be swapped for direct DB access later

## Quick Reference

### File Locations

| Layer          | Path                         | Purpose                                  |
| -------------- | ---------------------------- | ----------------------------------------- |
| App Router     | `src/app/`                   | Pages, layouts, Server/Client boundary    |
| Components     | `src/components/`            | Reusable UI components                    |
| Hooks          | `src/hooks/api/`              | TanStack Query hooks                      |
| Services       | `src/services/`              | fetch wrappers to internal `/api` routes  |
| Route Handlers | `src/app/api/`                | Backend request handling                  |
| Data Layer     | `src/lib/db/`                | DB schema, queries, migrations            |
| Types          | `src/services/types.ts`      | Shared API contracts                      |
| Middleware     | `src/middleware.ts`          | Route protection                          |

### Common Imports

```typescript
// Authentication
import { useAuth } from "~/hooks/api";

// User operations
import { useUsers, useUser, useCreateUser } from "~/hooks/api";

// Storage operations
import { useUploadFile, useDeleteFile } from "~/hooks/api";

// Direct service access
import { authService, userService, storageService } from "~/services";

// Data layer (server-only: Route Handlers, Server Components, Server Actions)
import { getUserById } from "~/lib/db/queries/users";

// Types
import type { User, CreateUserInput, PaginatedResponse } from "~/services/types";
```

This fullstack architecture keeps the same component/hook/service ergonomics as the frontend-only TanStack Start pattern, while colocating the backend in the same Next.js project — trading some deployment portability for a simpler single-repo, single-deploy setup with shared types and no CORS.
