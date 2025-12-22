# Stage 1: Build
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (only production deps needed for build usually, but devDependencies are often needed for react-scripts)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Accept build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_GOOGLE_SCOPES
ARG REACT_APP_STRIPE_PUBLIC_KEY
ARG REACT_APP_OPENROUTER_API_URL
ARG REACT_APP_OPENROUTER_API_KEY
ARG REACT_APP_PHYLLO_ENV
ARG REACT_APP_PHYLLO_REDIRECT

# Set them as environment variables during build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_SCOPES=$REACT_APP_GOOGLE_SCOPES
ENV REACT_APP_STRIPE_PUBLIC_KEY=$REACT_APP_STRIPE_PUBLIC_KEY
ENV REACT_APP_OPENROUTER_API_URL=$REACT_APP_OPENROUTER_API_URL
ENV REACT_APP_OPENROUTER_API_KEY=$REACT_APP_OPENROUTER_API_KEY
ENV REACT_APP_PHYLLO_ENV=$REACT_APP_PHYLLO_ENV
ENV REACT_APP_PHYLLO_REDIRECT=$REACT_APP_PHYLLO_REDIRECT
ENV NODE_ENV=production

# Build the app
RUN pnpm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy build artifacts
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
