# Meher EMB — production image (Express API + built React client)
FROM node:24-alpine

# Refresh OS packages and keep a toolchain available so the better-sqlite3
# native module can be compiled if no matching prebuilt binary exists.
RUN apk upgrade --no-cache \
    && apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
# Install build + runtime dependencies BEFORE NODE_ENV=production is set,
# otherwise npm omits devDependencies and `tsc`/`vite` are unavailable below.
RUN npm install --no-audit --no-fund \
    && (node -e "require('better-sqlite3')" \
        || (npm rebuild better-sqlite3 --foreground-scripts && node -e "require('better-sqlite3')"))

COPY . .
RUN npm run build \
    && npm prune --omit=dev \
    && mkdir -p /app/data/uploads/artwork /app/data/uploads/delivery /app/data/uploads/portfolio

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/data/meher-emb.db \
    UPLOAD_DIR=/app/data/uploads

EXPOSE 3000

CMD ["node", "server/index.js"]
