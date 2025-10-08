FROM node:24-alpine
COPY . /app

WORKDIR /app
ENV NODE_ENV=production

RUN npm ci --omit=dev
CMD ["node", "app.js"]