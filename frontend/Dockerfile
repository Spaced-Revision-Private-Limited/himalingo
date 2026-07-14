FROM node:20
WORKDIR /app
ENV PORT=80

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 80
CMD ["npm", "run", "start"]