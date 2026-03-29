FROM node:24-alpine
COPY . /app

WORKDIR /app
ENV NODE_ENV=production

EXPOSE 16969/tcp

LABEL org.opencontainers.image.source=https://github.com/Choomai/choomai-bot
LABEL org.opencontainers.image.description="choomai-bot Image"
LABEL org.opencontainers.image.licenses="AGPL-3.0"

RUN npm ci --omit=dev
CMD ["node", "app.js"]