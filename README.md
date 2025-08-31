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
│   └── chat-service/        # Conversational AI service
├── frontend/                # React frontend
├── docker-compose.yml       # Docker Compose configuration
└── README.md                # This file
```

## API Documentation

API documentation is available at `/api-docs` when the services are running.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-home-energy-monitor
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the services:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:3001/api-docs
   - Database: PostgreSQL on port 5432

## Development

### Running Tests

```bash
# Run tests for all services
npm test
```

### Generating Test Data

Use the provided script to generate test telemetry data:

```bash
python scripts/generate_telemetry.py
```

## License

MIT
