FROM oven/bun:1-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package.json ./
COPY bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Set default environment variables
ENV EMAIL_PORT=587
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 8080

# Health check - now using /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/webhook/health || exit 1

# Start the application
CMD ["bun", "index.ts"]