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

3. Update `MONGODB_URI` and `CLIENT_URL` in `.env` for your environment.

4. Start the development server:

   ```bash
   npm run dev
   ```

The API defaults to `http://localhost:4000`. Check it at:

```text
GET http://localhost:4000/api/v1/health
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API with `tsx` watch mode |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production server |

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

No domain models or authentication behavior are included yet.
