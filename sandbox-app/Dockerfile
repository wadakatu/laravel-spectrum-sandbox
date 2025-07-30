FROM node:18-alpine

WORKDIR /app

# Copy all files including node_modules
COPY . .

# Create necessary directories
RUN mkdir -p /app/public /app/src

EXPOSE 3001

CMD ["npm", "start"]