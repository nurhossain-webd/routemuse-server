# RouteMuse AI Server

Production-oriented Express and TypeScript API foundation for RouteMuse AI.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, and
   `GOOGLE_CLIENT_ID` in `.env` for your environment. `JWT_SECRET` must contain
   at least 32 characters. Create the Google client ID in Google Cloud Console
   for the same browser application that obtains ID tokens.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API defaults to `http://localhost:4000`. Check it at:

```text
GET http://localhost:4000/api/v1/health
```

## Authentication

All responses use `{ "success", "message", "data" }` for success and
`{ "success", "message", "errors?" }` for errors.

| Method and route | Description | Authentication |
| --- | --- | --- |
| `POST /api/v1/auth/register` | Create a local account | Public |
| `POST /api/v1/auth/login` | Sign in with email and password | Public |
| `POST /api/v1/auth/google` | Exchange a Google ID token | Public |
| `GET /api/v1/auth/me` | Return the current user | Bearer token |
| `POST /api/v1/auth/logout` | Confirm client-side logout | Bearer token |

Send protected requests with:

```http
Authorization: Bearer <access-token>
```

Access tokens are stateless and remain valid until their configured expiration.
Logout requires the client to delete its token. Add server-side sessions or a
revocation store if immediate token invalidation becomes a requirement.

Google login accepts `{ "idToken": "..." }`. The API verifies the token's
signature, issuer, expiry, audience, and verified email through Google's server
library. A first-time verified Google user is created automatically.

Passwords are limited to 72 characters to avoid bcrypt's silent input
truncation. Password hashes and internal Google identifiers are excluded from
API output.

## Demo user

Configure `DEMO_USER_NAME`, `DEMO_USER_EMAIL`, and `DEMO_USER_PASSWORD` in
`.env`, then run:

```bash
npm run seed:demo
```

The command is idempotent and refreshes the configured demo user's password.

## Travel experiences

Public discovery routes:

| Method and route | Description |
| --- | --- |
| `GET /api/v1/experiences` | Search, filter, sort, and paginate published experiences |
| `GET /api/v1/experiences/:slug` | Retrieve a published experience |
| `GET /api/v1/experiences/:slug/related` | Retrieve related published experiences |
| `GET /api/v1/experiences/:experienceId/reviews` | Paginate experience reviews |

The listing route accepts `search`, `category`, `country`, `location`,
`minPrice`, `maxPrice`, `minRating`, `sort`, `page`, and `limit`. Sort values
are `newest`, `price_asc`, `price_desc`, and `rating`; `limit` is capped at 100.

Protected Bearer-token routes:

| Method and route | Description |
| --- | --- |
| `POST /api/v1/experiences` | Create an experience |
| `GET /api/v1/experiences/mine` | List the current user's experiences |
| `DELETE /api/v1/experiences/:id` | Delete an owned experience; admins may delete any |
| `POST /api/v1/experiences/:id/favorite` | Add a favorite |
| `DELETE /api/v1/experiences/:id/favorite` | Remove a favorite |
| `GET /api/v1/users/me/favorites` | List the current user's favorites |
| `POST /api/v1/experiences/:id/reviews` | Submit one review per user and experience |

All text inputs are schema-bounded and stripped of HTML. MongoDB uniqueness
constraints protect slugs, favorites, and one-review-per-user rules against
concurrent requests. Deleting an experience also removes its reviews,
favorites, and interaction history.

To load the 12 curated travel experiences, first create the demo user and then
run the idempotent experience seed:

```bash
npm run seed:demo
npm run seed:experiences
```

Seed images use stable Unsplash image URLs documented directly in
`src/scripts/seed-experiences.ts`.

## Authentication integration test

Set `TEST_MONGODB_URI` to a dedicated database whose name ends in `_test` or
`-test`, then run:

```bash
npm run test:auth
```

The runnable integration test covers registration, normalized email, invalid
password handling, login, Bearer authentication, `/me`, and password-hash
redaction. It deletes its temporary user afterward.

Run the experience API test against the same dedicated test database:

```bash
npm run test:api
```

It covers creation, search/filter/sort/pagination, detail and related reads,
favorites, reviews and duplicate prevention, deletion authorization, cascade
cleanup, and interaction persistence.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API with `tsx` watch mode |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production server |
| `npm run seed:demo` | Create or refresh the environment-configured demo user |
| `npm run seed:experiences` | Upsert 12 curated travel experiences |
| `npm run test:auth` | Run the authentication integration flow |
| `npm run test:api` | Run the travel experience API integration flow |

## AI Trip Planner

Set `GROQ_API_KEY` in `.env` and optionally override `GROQ_MODEL` (the default is
`openai/gpt-oss-20b`). The key is used only by the API server and must never use
a `NEXT_PUBLIC_` prefix. AI planning has a separate configurable rate limit.

Authenticated planner endpoints are:

| Method and route | Description |
| --- | --- |
| `POST /api/v1/ai/trip-plans` | Retrieve matching experiences, generate, verify, and save a plan |
| `POST /api/v1/ai/trip-plans/:id/refine` | Refine an owned plan and append conversation history |
| `GET /api/v1/ai/trip-plans` | List the current user's saved plans |
| `GET /api/v1/ai/trip-plans/:id` | Read an owned plan and its conversation |
| `DELETE /api/v1/ai/trip-plans/:id` | Delete an owned plan and conversation |

The provider adapter uses Groq's OpenAI-compatible structured-output API.
Provider output is schema-validated and repaired once if invalid. Experience
prices and the final total are verified in application code before persistence.

## Source structure

```text
src/
├── config/       # Environment and external-service configuration
├── controllers/  # HTTP request handlers
├── middleware/   # Express middleware and error boundaries
├── models/       # Mongoose domain models
├── routes/       # Versioned route composition
├── services/     # Business logic, planner orchestration, and LLM adapters
├── types/        # Shared TypeScript contracts
├── utils/        # Reusable helpers and errors
└── validations/  # Runtime input and environment schemas
```

Authentication, experience discovery, and AI trip planning models are implemented.
