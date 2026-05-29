FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json* ./

# Install packages with legacy peer-deps to avoid any react 19 compatibility alarms
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Build the optimized production static web app
RUN npm run build

# Expose Port 3000 to the container host
EXPOSE 3000

# Start the web app using our custom start script (vite preview on Port 3000)
CMD ["npm", "start"]
