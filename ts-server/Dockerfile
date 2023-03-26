# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

# Install any needed packages
RUN npm install express
RUN npm install path
RUN npm install typescript ts-node @types/node @types/express --save-dev
RUN npm install @google-cloud/datastore
RUN npm install dotenv

# Build the TypeScript application
RUN npm run build

# Set the environment variable to tell the runtime that it's running in a container
ENV PORT 8080

# Make the container's port 8080 available to the outside world
EXPOSE 8080

# Start the server
CMD [ "npm", "run" , "server"]

