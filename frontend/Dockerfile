FROM node:20-alpine

WORKDIR /app

ENV PORT=80

COPY package*.json ./
RUN npm install --production

COPY .next ./.next
COPY next.config.js ./next.config.js

EXPOSE 80

CMD ["npm", "run", "start"]
