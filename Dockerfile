# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
COPY --from=rust-builder . /

RUN pwd
RUN ls
RUN ls glorious-server

WORKDIR /glorious-server/ts-server

ENV PORT 8080
EXPOSE 8080

CMD ["npm", "run", "server"]
