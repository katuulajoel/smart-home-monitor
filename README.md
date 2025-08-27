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
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:3001/api-docs
   - Database: PostgreSQL on port 5432

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
