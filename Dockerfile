# Use Node.js 24 slim image
FROM node:24-slim

# Enable corepack for pnpm
RUN corepack enable

# Install curl for healthchecks
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

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

# Expose port
EXPOSE 3000

# Start command - using TimeWeb's expected path
CMD ["node", "dist/server/index.js"]
