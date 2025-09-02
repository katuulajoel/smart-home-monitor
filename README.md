# Smart Home Energy Monitoring with Conversational AI

A full-stack application for monitoring and analyzing home energy consumption through natural language queries.

## Features

- 🔐 User authentication and authorization
- 📊 Real-time energy consumption visualization
- 💬 Natural language query interface
- 📈 Time-series data analysis
- 🐳 Dockerized deployment

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with TimescaleDB extension
- **Frontend**: React with TypeScript
- **Authentication**: JWT
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Docker and Docker Compose
- PostgreSQL (for local development without Docker)

### Option 1: Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/smart-home-energy-monitor.git
   cd smart-home-energy-monitor
   ```

2. Copy the example environment file and update with your configuration:
   ```bash
   cp .env.example .env
   ```

3. Start all services with Docker Compose:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build -d
   ```

4. Access the application at `http://localhost:3000`

### Project Management

Track the project progress and time estimates in the [Project Management Table](https://docs.google.com/spreadsheets/d/1bgOTq2o4lau2fnLnn4eWhp9U0KJRm01TVepjkribAxg/edit?usp=sharing).

### Option 2: Manual Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/your-username/smart-home-energy-monitor.git
   cd smart-home-energy-monitor
   npm install
   ```

2. Set up the database:
   - Create a PostgreSQL database
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Update `.env` with your database credentials

3. Set up and start the Auth Service:
   ```bash
   # Run migrations
   npm run migrate:auth:dev
   
   # Seed initial data
   npm run seed:auth:dev
   
   # Start the service
   npm run dev:auth
   ```

4. In a new terminal, set up and start the Telemetry Service:
   ```bash
   # Run migrations
   npm run migrate:telemetry:dev
   
   # Seed initial data
   npm run seed:telemetry:dev
   
   # Start the service
   npm run dev:telemetry
   ```

5. In another terminal, set up and start the Chat Service:
   ```bash
   # Run migrations
   npm run migrate:chat:dev
   
   # Start the service
   npm run dev:chat
   ```

6. In a final terminal, start the Frontend:
   ```bash
   npm run dev:frontend
   ```

7. Access the application at `http://localhost:3000`

### Login Credentials
Use the following credentials to log in:
- Email: `user@example.com`
- Password: `password123`

## Database Migrations

This project uses Knex.js for database migrations. Migrations are version control for your database schema.

### Migration Strategy

We've adopted a service-based migration approach where each service manages its own database schema. This approach was chosen because:

1. **Service Independence**: Each service can evolve its database schema independently
2. **Team Autonomy**: Different teams can work on different services without coordinating migrations
3. **Future Flexibility**: Enables potential migration to separate databases per service if needed

#### When to Use Separate Migration Tables

- **Multiple Services**: Each service has its own `knex_migrations_<service>` table (e.g., `knex_migrations_telemetry`)
- **Independent Deployments**: When services are deployed separately
- **Team Structure**: When different teams manage different services
- **Migration Conflicts**: To avoid conflicts when multiple services modify the same database

### Development Workflow

1. **Creating Migrations**:
   ```bash
   # Navigate to the service directory
   cd <service-directory>
   
   # Create a new migration file e.g add_user_roles
   npm run migrate:make:dev <migration-name>
   
   # Edit the generated file in src/migrations/
   ```

2. **Running Migrations**:
   ```bash
   # Run all pending migrations
   npm run migrate:dev
   
   # Rollback the most recent migration
   npm run migrate:rollback:dev
   
   # Run database seeds (if any)
   npm run seed:dev
   ```

3. **Migration Guidelines**:
   - Always test migrations in development before committing
   - Include both `up` and `down` methods for rollback support
   - For TimescaleDB features that don't support transactions, disable them in the migration:
     ```typescript
     export const config = {
       transaction: false
     };
     ```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ DEVICES : owns
    USERS ||--o{ CHAT_MESSAGES : sends
    DEVICES ||--o{ TELEMETRY_DATA : generates
    DEVICE_TYPES ||--o{ DEVICES : categorizes
    
    USERS {
        uuid id PK
        string name
        string email
        string password
        string role
        timestamp created_at
        timestamp updated_at
    }
    
    DEVICE_TYPES {
        integer id PK
        string name
        string description
        string icon
        timestamp created_at
    }
    
    DEVICES {
        uuid id PK
        uuid user_id FK
        string name
        integer device_type_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    TELEMETRY_DATA {
        uuid id PK
        uuid device_id FK
        timestamp timestamp
        double energy_watts
        double voltage
        double current
        double power_factor
        timestamp created_at
    }
    
    CHAT_MESSAGES {
        uuid id PK
        uuid user_id FK
        string session_id
        string role
        text content
        jsonb metadata
        timestamp created_at
    }
```

### Schema Details

#### Auth Service (MVP Implementation)

##### `users` Table (Active)
- Simple JWT-based authentication
- No refresh tokens initially
- Basic role-based access control

#### Telemetry Service

##### `device_types` Table
- Defines different types of devices (fridge, AC, etc.)
- Supports UI representation with icons
- Enables consistent categorization

##### `devices` Table
- Represents physical devices
- Links to device types and owners
- Tracks creation and updates

##### `telemetry_data` Table
- Time-series data storage
- Optimized with TimescaleDB hypertables
- Stores energy metrics
- Indexed for fast time-based queries

#### Chat Service

##### `chat_messages` Table
- Stores conversation history
- Supports both user and assistant messages
- Uses session_id to group messages
- Flexible metadata field for additional context

## Implementation Notes

### Authentication (MVP)
- Using stateless JWT tokens
- Simple token expiration (e.g., 24 hours)

### Database Design
- Schema is forward-compatible with future enhancements
- All foreign keys and relationships are maintained

## Project Structure

```
smart-home-energy-monitor/
├── backend/                 # Backend services
│   ├── auth-service/        # Authentication service
│   ├── telemetry-service/   # Telemetry data handling
│   ├── chat-service/        # Conversational AI service
│   └── shared/              # Shared code
├── frontend/                # React frontend
├── docker-compose.yml       # Docker Compose configuration
└── README.md                # This file
```

## API Documentation

Each microservice provides its own interactive API documentation using Swagger UI. You can access them at:

- **Auth Service**: `http://localhost:3001/api-docs`
- **Telemetry Service**: `http://localhost:3002/api-docs`
- **Chat Service**: `http://localhost:3003/api-docs`

### Authentication

To use the protected endpoints in the Telemetry and Chat services, you'll need to:

1. First, obtain an authentication token from the Auth Service:
   - Use the `/api/auth/login` endpoint with valid credentials
   - You'll receive a JWT token in the response

2. Authorize in Swagger UI:
   - Click the "Authorize" button (lock icon) in the top-right corner
   - Enter your JWT token in the format: `<your-jwt-token>`
   - Click "Authorize" to enable authenticated requests


## Development

### Running Tests

```bash
# Run tests for all services
npm test
```

## License

MIT
