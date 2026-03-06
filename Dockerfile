# MosBot Dashboard — multi-stage build
FROM --platform=$BUILDPLATFORM node:25-alpine3.22 AS base

# Install security updates and dumb-init for proper signal handling
RUN apk update && \
  apk upgrade && \
  apk add --no-cache dumb-init && \
  rm -rf /var/cache/apk/*

# App directory (node user already exists in official image)
WORKDIR /app

# Development dependencies stage (for future test/build stages)
FROM base AS dev-dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts && \
  npm cache clean --force

# Development stage (for local development with hot reload)
FROM base AS development

# Accept build-time env vars (injected by docker build --build-arg or compose args:)
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_APP_NAME=MosBot

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Set development environment
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=5173
# Polling is more reliable for file watching on bind mounts (Docker Desktop/macOS).
ENV CHOKIDAR_USEPOLLING=true
ENV CHOKIDAR_INTERVAL=1000

WORKDIR /app

# Copy all dependencies (including dev dependencies)
COPY --from=dev-dependencies /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Source is bind-mounted at runtime; this just pre-installs deps
EXPOSE 5173

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Stage 1: build the Vite app
FROM base AS build

WORKDIR /app

# Accept build-time env vars (injected by docker build --build-arg or compose args:)
ARG VITE_API_URL=http://localhost:3000/api/v1
ARG VITE_APP_NAME=MosBot

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.29-alpine AS production

# Remove default nginx config and add our own
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
