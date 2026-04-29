FROM node:20-alpine

WORKDIR /app

# Copy workspace root manifests
COPY package.json package-lock.json* ./

# Copy shared package
COPY packages/ ./packages/

# Copy web package.json first — layer caches npm install
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies at root
RUN npm install --legacy-peer-deps

# Copy remaining web source
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

EXPOSE 5175

# Launch Vite dev server bound to all interfaces (required inside Docker)
CMD ["node", "/app/node_modules/vite/bin/vite.js", "--host", "0.0.0.0"]
