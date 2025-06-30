# Stage 1: Build the application
FROM node:20-alpine AS builder

# Install FFmpeg
RUN apk update
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json and package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install all node modules including devDependencies
RUN npm install

# Copy app source
COPY . .

# Build the application
RUN npm run build

# Stage 2: Set up the production environment
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production node modules
RUN npm install --only=production

# Copy built assets from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Your application's default port
EXPOSE 8080

CMD ["node", "dist/src/main"]
