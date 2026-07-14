FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001
CMD ["node", "--import", "tsx", "server/index.ts"]
