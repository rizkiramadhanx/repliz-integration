# Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npx playwright install --with-deps chromium

COPY --from=builder /usr/src/app/dist ./dist

# Entrypoint: fix volume permissions then run as pwuser (bawaan image Playwright)
COPY docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh
RUN chmod +x /usr/src/app/docker-entrypoint.sh
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]

EXPOSE 4000

CMD ["node", "dist/main.js"]
