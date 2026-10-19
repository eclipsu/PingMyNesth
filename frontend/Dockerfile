FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time; API_UPSTREAM is read by the
# /api rewrite, which is also resolved at build time.
ARG NEXT_PUBLIC_PRODUCTION=true
ARG NEXT_PUBLIC_API_BASE_URL=
ARG API_UPSTREAM=http://localhost:8080
ENV NEXT_PUBLIC_PRODUCTION=$NEXT_PUBLIC_PRODUCTION \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    API_UPSTREAM=$API_UPSTREAM
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
