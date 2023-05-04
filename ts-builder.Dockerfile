# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
COPY --from=rust-builder /glorious-server /epic-server

WORKDIR /epic-server/ts-server

# Install dependencies
RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get install -y curl \
    && apt-get install -y pkg-config \
    && apt-get install -y libssl-dev \
    && apt-get install -y libpython3.7-dev

# Install Python 3.7 and pip for it
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y python3.7 python3.7-dev python3-pip

# Make sure Python 3.7 is the default Python version
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.7 1 && \
    update-alternatives --set python /usr/bin/python3.7

# Install Python dependencies
RUN pip3 install gql \
    && pip3 install requests

ENV PYTHON /usr/bin/python3.7

# Install Node.js dependencies
RUN npm install path \
    && npm install typescript ts-node @types/node @types/express --save-dev \
    && npm install express \
    && npm install --save @google-cloud/datastore \
    && npm install --save @google-cloud/secret-manager \
    && npm install --save @google-cloud/storage \
    && npm install --save ffi-napi  @types/ffi-napi \
    && npm i --save-dev @types/jsonwebtoken \
    && npm i --save-dev @types/bcrypt \
    && npm install jsonwebtoken \
    && npm install bcrypt \
    && npm install dotenv --save \
    && npm install fs \
    && npm install jszip \
    && npm install util \
    && npm install zip-dir \
    && npm install child_process

# Build the TypeScript application
RUN npm run build
