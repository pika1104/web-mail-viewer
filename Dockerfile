FROM node:18-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

# Create data directory
RUN mkdir -p data

EXPOSE 3000 2525

CMD ["npm", "start"]
