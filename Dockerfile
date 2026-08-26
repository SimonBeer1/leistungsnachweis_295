FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY uploads ./uploads
EXPOSE 3000
CMD ["node", "src/server.ts"]
