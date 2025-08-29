# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code and environment files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy package.json for start script and environment files
COPY --from=builder /app/package*.json ./

# Copy knexfile and migrations
COPY --from=builder /app/src/knexfile.ts ./
COPY --from=builder /app/src/migrations ./migrations

# Expose port
EXPOSE ${AUTH_SERVICE_PORT:-3001}

# Start the application
CMD ["npm", "start"]
