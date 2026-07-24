# ---- Builder ----
FROM node:20 AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy your local production build folder and project files
COPY .next ./.next
COPY package.json ./package.json
COPY next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]
