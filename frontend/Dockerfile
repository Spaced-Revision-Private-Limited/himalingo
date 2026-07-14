FROM node:20
WORKDIR /app
ENV PORT=80

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy built artifacts from the builder stage
COPY --from=0 /app/.next ./.next
COPY --from=0 /app/public ./public
COPY package.json ./package.json
COPY next.config.js ./next.config.js

EXPOSE 3000

CMD ["npm", "run", "start"]
