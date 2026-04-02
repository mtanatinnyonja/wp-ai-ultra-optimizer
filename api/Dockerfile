FROM node:20-alpine

# Chrome/Puppeteer dependencies
RUN apk add --no-cache \
    chromium nss freetype freetype-dev harfbuzz \
    ca-certificates ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p db

EXPOSE 3000
CMD ["node", "server.js"]
