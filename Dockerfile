# Meher EMB — production image (Express API + built React client)
FROM node:24-alpine

# Refresh OS packages and keep a toolchain available in case the
# better-sqlite3 native module has to be compiled for this Node ABI.
RUN apk upgrade --no-cache \
    && apk add --no-cache python3 make g++

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build \
    && npm prune --omit=dev \
    && mkdir -p /app/data/uploads/artwork /app/data/uploads/delivery /app/data/uploads/portfolio

ENV PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/data/meher-emb.db \
    UPLOAD_DIR=/app/data/uploads

EXPOSE 3000

CMD ["node", "server/index.js"]
