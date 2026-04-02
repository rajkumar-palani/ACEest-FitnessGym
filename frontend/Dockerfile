# Use Node.js 20 LTS as the base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM base AS production

# Copy source code
COPY frontend/ ./

# Build the application
RUN npm run build

# Use nginx to serve the built application
FROM nginx:alpine AS final

# Copy built application from production stage
COPY --from=production /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]