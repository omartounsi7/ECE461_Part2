# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
COPY --from=rust-builder . /

RUN pwd
RUN ls
RUN ls glorious-server

WORKDIR /glorious-server/ts-server

# Install dependencies
RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get install -y curl \
    && apt-get install -y pkg-config \
    && apt-get install -y libssl-dev

# Install Python and pip
RUN apt-get install -y python3-pip
ENV PYTHON /usr/bin/python3

# Install Python dependencies
RUN pip3 install gql
RUN pip3 install requests

# Install Node.js dependencies
RUN npm install path \
    && npm install typescript ts-node @types/node @types/express --save-dev \
    && npm install --save @google-cloud/datastore \
    && npm install --save @google-cloud/secret-manager \
    && npm install --save @google-cloud/storage \
    && npm install --save ffi-napi  @types/ffi-napi \
    && npm i --save-dev @types/jsonwebtoken \
    && npm i --save-dev @types/bcrypt \
    && npm install dotenv --save \
    && npm install fs \
    && npm install jszip \
    && npm install util \
    && npm install zip-dir \
    && npm install child_process

# Build the TypeScript application
RUN npm run build
