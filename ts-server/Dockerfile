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

# Install Python dependencies
RUN pip install multidict
RUN pip install gql
RUN pip install requests
RUN pip install regex
RUN pip install PyGithub
RUN pip install requests_toolbelt
RUN pip install coverage

# Install Rust
RUN apt-get update && apt-get install -y curl && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    . $HOME/.cargo/env && \
    rustup default stable

# Build the Rust program
COPY grrs /ts-server/grrs
WORKDIR /ts-server/grrs
RUN cargo install grcov
RUN cargo build --release

# Build the TypeScript application
WORKDIR /ts-server

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
RUN npm run build

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Set the environment variable to tell the runtime that it's running in a container
ENV PORT 8080

# Make the container's port 8080 available to the outside world
EXPOSE 8080

# Start Nginx 
CMD [ "service", "nginx" , "start"]

# Start the server
CMD [ "npm", "run" , "server"]
