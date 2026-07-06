# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for env (optional)
ARG VITE_PUBLIC_APP_ACTION=Boilerplate
ARG VITE_PUBLIC_APP_NAME="Boilerplate NestJS React"
ARG VITE_PUBLIC_NODE_ENV=production
ARG VITE_PUBLIC_BACKEND_AUTH_URL=https://dummyjson.com

ENV VITE_PUBLIC_APP_ACTION=$VITE_PUBLIC_APP_ACTION
ENV VITE_PUBLIC_APP_NAME=$VITE_PUBLIC_APP_NAME
ENV VITE_PUBLIC_NODE_ENV=$VITE_PUBLIC_NODE_ENV
ENV VITE_PUBLIC_BACKEND_AUTH_URL=$VITE_PUBLIC_BACKEND_AUTH_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
