# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

# Install dependencies
RUN apt-get update \
    && apt-get install -y python3-pip \
    && apt-get install -y libssl-dev

# Install Python dependencies
RUN pip3 install gql \
    && pip3 install requests

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

# Copy the binary file from the Rust builder container
COPY --from=builder /ts-server/grrs/target/release/grrs /usr/local/bin/grrs

# Build the TypeScript application
RUN npm run build

ENV PORT 8080
EXPOSE 8080
CMD ["npm", "run", "server"]
