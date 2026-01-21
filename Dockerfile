# Stage 1: Build Node.js application
FROM node:24-slim AS builder

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the application
RUN pnpm build

# Stage 2: Production image with Caddy
FROM caddy:2-alpine

# Install Node.js in the Caddy image
RUN apk add --no-cache nodejs npm

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/uploads ./uploads

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose ports (80 for HTTP, 443 for HTTPS)
EXPOSE 80 443

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'node dist/server/index.js &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &' >> /start.sh && \
    echo 'CADDY_PID=$!' >> /start.sh && \
    echo 'wait $NODE_PID $CADDY_PID' >> /start.sh && \
    chmod +x /start.sh

# Start both Node.js and Caddy
CMD ["/start.sh"]
