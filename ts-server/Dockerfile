# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

# Install nginx
RUN apt-get update && \
    apt-get install -y nginx

# Install Make
RUN apt-get update && apt-get install -y build-essential
RUN apt-get update && apt-get install -y make

# Install Python
RUN apt-get update && apt-get install -y python
ENV PYTHON /usr/bin/python

# Install pm2
RUN npm install pm2 -g

# Install any needed packages
RUN npm install express
RUN npm install path
RUN npm install typescript ts-node @types/node @types/express --save-dev
RUN npm install --save @google-cloud/datastore
RUN npm install --save @google-cloud/secret-manager
RUN npm install --save @google-cloud/storage
RUN npm install --save ffi-napi  @types/ffi-napi
RUN npm i --save-dev @types/jsonwebtoken
RUN npm i --save-dev @types/bcrypt
RUN npm install dotenv --save
RUN npm install bcrypt
RUN npm install jsonwebtoken
RUN npm install fs
RUN npm install jszip
RUN npm install zlib
RUN npm install util
RUN npm install zip-dir
RUN npm install child_process
RUN npm install rimraf

# Build the TypeScript application
RUN npm run clean
RUN npm run build

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Set the environment variable to tell the runtime that it's running in a container
ENV PORT 8080

# Expose ports for Nginx and your Node.js application
#EXPOSE 80
EXPOSE 8080

CMD ["npm", "run", "server"]

# Start Nginx and your Node.js application using pm2
# CMD ["pm2-runtime", "start", "npm", "--", "run", "start:pm2"]
