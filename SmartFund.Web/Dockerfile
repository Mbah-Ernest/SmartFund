# syntax=docker/dockerfile:1.7
# Build the Vite SPA and serve it via nginx, which also reverse-proxies /api -> api:8080.

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /src

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .

# VITE_API_BASE_URL stays unset so the SPA calls /api on the same origin (proxied by nginx).
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80
