FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server application files
COPY server.js ./
COPY models/ ./models/
COPY docs/ ./docs/
COPY public/ ./public/

EXPOSE 5001

USER node

CMD ["node", "server.js"]
