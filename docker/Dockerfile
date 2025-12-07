# Use the official Node.js image as the base image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Use the official Nginx image to serve the React app
FROM nginxinc/nginx-unprivileged:alpine

# Copy only JS/CSS from the build output
COPY --from=0 /app/build/yasgui.min.js /usr/share/nginx/html/
COPY --from=0 /app/build/yasgui.min.css /usr/share/nginx/html/

# Copy other static assets
COPY docker/src/ /usr/share/nginx/html/

USER root

COPY docker/change-default-endpoint.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/change-default-endpoint.sh
RUN chown 1001:0 -R /usr/share/nginx/html/

USER 1001