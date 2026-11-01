# Stack de desenvolvimento: Vite com hot reload + API do documento (server/docApi.ts).
# glibc (slim) em vez de alpine: os binários nativos do Vite/rolldown no lockfile são para glibc.
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATA_FILE=/app/storage/fortime.json
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
