FROM node:20
WORKDIR /app
ENV PORT=80

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 80
CMD ["npm", "run", "start"]
