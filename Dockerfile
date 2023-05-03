# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
#COPY --from=ts-builder /epic-server /grandiose-server
#WORKDIR /grandiose-server/ts-server


WORKDIR /ts-server
COPY . /ts-server
RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y curl
RUN apt-get install -y pkg-config
RUN apt-get install -y libssl-dev
# Install Python and pip
RUN apt-get install -y python3-pip
ENV PYTHON /usr/bin/python3
# Install any needed packages
#RUN npm install express
RUN npm install path
RUN npm install typescript ts-node @types/node @types/express --save-dev
RUN npm install --save @google-cloud/datastore
RUN npm install --save @google-cloud/secret-manager
RUN npm install --save @google-cloud/storage
RUN npm install --save ffi-napi  @types/ffi-napi
RUN npm i --save-dev @types/jsonwebtoken
RUN npm i --save-dev @types/bcrypt
RUN npm install dotenv --save
#RUN npm install bcrypt
#RUN npm install jsonwebtoken
RUN npm install fs
RUN npm install jszip
#RUN npm install zlib
RUN npm install util
RUN npm install zip-dir
RUN npm install child_process
#RUN npm install rimraf
WORKDIR /ts-server
RUN npm run build


ENV PORT 8080
EXPOSE 8080

CMD ["npm", "run", "server"]
