# Build stage
FROM node:18-alpine as build-stage

WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production

# Install build dependencies
RUN npm ci

# Build frontend
RUN npm run build

# Install server dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Production stage
FROM node:18-alpine as production-stage

# Install sqlite3
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy built frontend
COPY --from=build-stage /app/dist ./dist

# Copy server files
COPY --from=build-stage /app/server ./server

# Create data directory
RUN mkdir -p server/data

# Initialize database
RUN cd server && node utils/initDatabase.js

# Expose ports
EXPOSE 8030 8031

# Create startup script
RUN echo '#!/bin/sh' > start.sh && \
    echo 'cd /app/server' >> start.sh && \
    echo 'node index.js &' >> start.sh && \
    echo 'cd /app' >> start.sh && \
    echo 'npx serve -s dist -l 8030' >> start.sh && \
    chmod +x start.sh

# Start the application
CMD ["./start.sh"]