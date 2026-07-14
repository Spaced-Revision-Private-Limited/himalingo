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