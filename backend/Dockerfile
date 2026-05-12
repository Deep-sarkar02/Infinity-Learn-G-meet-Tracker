FROM node:20-alpine

# Prisma engines + container healthcheck
RUN apk add --no-cache openssl libc6-compat wget

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY . .
RUN npx prisma generate \
    && chown -R node:node /app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health >/dev/null || exit 1

USER node
CMD ["node", "src/server.js"]
