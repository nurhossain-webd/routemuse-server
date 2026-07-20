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

## Authentication integration test

Set `TEST_MONGODB_URI` to a dedicated database whose name ends in `_test` or
`-test`, then run:

```bash
npm run test:auth
```

The runnable integration test covers registration, normalized email, invalid
password handling, login, Bearer authentication, `/me`, and password-hash
redaction. It deletes its temporary user afterward.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API with `tsx` watch mode |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production server |
| `npm run seed:demo` | Create or refresh the environment-configured demo user |
| `npm run test:auth` | Run the authentication integration flow |

## Source structure

```text
src/
├── config/       # Environment and external-service configuration
├── controllers/  # HTTP request handlers
├── middleware/   # Express middleware and error boundaries
├── models/       # Future Mongoose models
├── routes/       # Versioned route composition
├── services/     # Future business logic and integrations
├── types/        # Shared TypeScript contracts
├── utils/        # Reusable helpers and errors
└── validations/  # Runtime input and environment schemas
```

The authentication model is implemented. Experience and other domain models
remain intentionally absent.
