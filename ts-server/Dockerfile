# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

# Install Make
RUN apt-get update && apt-get install -y build-essential
RUN apt-get update && apt-get install -y make

# Install Python
RUN apt-get update && apt-get install -y python
ENV PYTHON /usr/bin/python

# Install any needed packages
RUN npm install express
RUN npm install path
RUN npm install typescript ts-node @types/node @types/express --save-dev
RUN npm install --save @google-cloud/datastore
RUN npm install --save @google-cloud/secret-manager
RUN npm install --save ffi-napi  @types/ffi-napi
RUN npm i --save-dev @types/jsonwebtoken
RUN npm i --save-dev @types/bcrypt
RUN npm install dotenv --save
RUN npm install bcrypt

# Build the TypeScript application
RUN npm run build

# Set the environment variable to tell the runtime that it's running in a container
ENV PORT 8080

# Make the container's port 8080 available to the outside world
EXPOSE 8080

# Start the server
CMD [ "npm", "run" , "server"]

