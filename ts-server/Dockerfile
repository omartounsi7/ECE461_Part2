# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

RUN pwd
RUN ls
RUN ls /ts-server/src
RUN ls /ts-server/grrs
RUN ls /ts-server/grrs/src

# Install stuff
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y make
RUN apt-get install -y curl
RUN apt-get install -y pkg-config
RUN apt-get install -y libssl-dev
RUN apt-get install -y openssl-devel

# Install Python and pip
RUN apt-get install -y python3-pip
ENV PYTHON /usr/bin/python3

# Install Python dependencies
RUN pip3 install --upgrade pip
RUN pip3 install --upgrade setuptools
RUN pip3 install cffi
RUN pip3 install multidict
RUN pip3 install gql
RUN pip3 install requests
RUN pip3 install regex
RUN pip3 install PyGithub
RUN pip3 install requests_toolbelt
RUN pip3 install coverage

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

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Builds Rust
WORKDIR /ts-server/grrs
RUN cargo build --release

RUN pwd
RUN ls src
RUN ls src/target
RUN ls src/target/release

# Build the TypeScript application
WORKDIR /ts-server

RUN pwd
RUN ls
RUN ls /ts-server/src
RUN ls /ts-server/grrs
RUN ls /ts-server/grrs/src

RUN npm run clean
RUN npm run build

RUN pwd
RUN ls
RUN ls /ts-server/src
RUN ls /ts-server/grrs
RUN ls /ts-server/grrs/src

ENV PORT 8080
EXPOSE 8080
CMD ["npm", "run", "server"]
