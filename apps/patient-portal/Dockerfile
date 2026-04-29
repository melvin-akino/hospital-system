FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY apps/patient-portal/package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY apps/patient-portal/ ./

EXPOSE 5174

# Launch Vite dev server bound to all interfaces (required inside Docker)
CMD ["node", "/app/node_modules/vite/bin/vite.js", "--host", "0.0.0.0"]
