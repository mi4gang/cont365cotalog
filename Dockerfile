# Use Caddy as base image
FROM caddy:2-alpine

# Install Node.js and build tools
RUN apk add --no-cache nodejs npm python3 make g++

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

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose ports (80 for HTTP, 443 for HTTPS)
EXPOSE 80 443

# Create startup script that runs both Node.js and Caddy
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting Node.js application..."' >> /start.sh && \
    echo 'cd /app && NODE_ENV=production node dist/server/index.js &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'echo "Node.js started with PID $NODE_PID"' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'echo "Starting Caddy..."' >> /start.sh && \
    echo 'caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &' >> /start.sh && \
    echo 'CADDY_PID=$!' >> /start.sh && \
    echo 'echo "Caddy started with PID $CADDY_PID"' >> /start.sh && \
    echo 'wait $NODE_PID $CADDY_PID' >> /start.sh && \
    chmod +x /start.sh

# Start both services
CMD ["/start.sh"]
