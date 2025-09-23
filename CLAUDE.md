# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Full Application (Root Level)
- `npm run build` - Build all services (shared, auth, telemetry, chat, frontend)
- `npm run test:all` - Run tests across all workspaces
- `docker-compose -f docker-compose.dev.yml up --build -d` - Start all services with Docker (recommended)

### Individual Services
Each service has consistent commands:

**Auth Service** (port 3001):
- `npm run dev:auth` - Development server
- `npm run build:auth` - Build auth service
- `npm run migrate:auth:dev` - Run database migrations (development)
- `npm run seed:auth:dev` - Seed initial data (admin user: user@example.com / password123)

**Telemetry Service** (port 3002):
- `npm run dev:telemetry` - Development server
- `npm run migrate:telemetry:dev` - Run database migrations
- `npm run seed:telemetry:dev` - Seed sample devices and data

**Chat Service** (port 3003):
- `npm run dev:chat` - Development server
- `npm run migrate:chat:dev` - Run database migrations

**Frontend** (port 3000):
- `npm run dev:frontend` - Next.js development server
- `npm run build:frontend` - Build for production
- `npm run lint:frontend` - ESLint

### Service-Level Commands
Inside each backend service directory:
- `npm run dev` - Development server with hot reload (ts-node-dev)
- `npm run build` - TypeScript compilation
- `npm run test` - Jest tests
- `npm run test:watch` - Jest in watch mode
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run migrate:dev` - Run migrations (uses src/knexfile.ts)
- `npm run seed:dev` - Run seeds

## Architecture

### Monorepo Structure
This is a TypeScript monorepo using npm workspaces with these packages:
- `backend/shared` - Common utilities, middleware, types
- `backend/auth-service` - JWT authentication
- `backend/telemetry-service` - Energy data collection/storage
- `backend/chat-service` - Conversational AI interface
- `frontend` - Next.js React app

### Database Architecture
- **Single PostgreSQL database** with TimescaleDB extension for time-series data
- **Service-specific migration tables**: Each service manages its own migrations via separate Knex migration tables (e.g., `knex_migrations_auth`, `knex_migrations_telemetry`)
- **Shared database**: All services connect to the same database but maintain separate schemas logically

### Key Technologies
- **Backend**: Node.js + Express + TypeScript
- **ORM**: Knex.js + Objection.js
- **Database**: PostgreSQL + TimescaleDB (hypertables for telemetry_data)
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Auth**: JWT tokens (stateless)
- **API Docs**: Swagger UI at `/api-docs` for each service

### Shared Package
The `@smart-home/shared` package provides:
- Authentication middleware (`authenticateToken`)
- Validation middleware
- Error handling utilities
- Winston logger configuration
- Common TypeScript interfaces (`ApiResponse`, `PaginationQuery`, etc.)

### Service Communication
- Services are independent but share the same database
- Frontend communicates with services via REST APIs
- Each service has its own Swagger documentation
- Services can be deployed independently

### Development Workflow
1. **Environment**: Copy `.env.example` to `.env` and configure
2. **Database**: Services auto-migrate and seed on startup in Docker
3. **Ports**: Auth (3001), Telemetry (3002), Chat (3003), Frontend (3000), DB (5432)
4. **Hot Reload**: All services support hot reload in development

### Database Migrations
- Each service uses its own migration table for independence
- Development uses TypeScript files (`src/knexfile.ts`, `src/migrations/`)
- Production uses compiled JavaScript (`dist/knexfile.js`)
- TimescaleDB features require `{ transaction: false }` in migration config

### Testing
- Jest for unit/integration tests
- Supertest for API testing
- Each service has independent test suites
- Shared utilities can be tested from any service that imports them

- use context7 to check up-to-date docs when needed for implementing new libraries or frameworks, or adding features using them.