FROM node:20-slim AS base
RUN npm install -g bun

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json .npmrc ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ---- Build Medusa ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- Production ----
FROM base AS runner
WORKDIR /app

COPY --from=build /app/.medusa/server/ ./

RUN bun install --production

EXPOSE 9000

CMD ["sh", "-c", "bunx medusa db:migrate && bun run start"]
