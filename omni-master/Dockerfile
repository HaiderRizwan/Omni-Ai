# Use Node.js 18 (or align with your local version)
FROM node:18-alpine

# Use pnpm (as specified in your package.json)
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package files first
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["pnpm", "start"]
