# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
COPY --from=ts-builder /glorious-server .

RUN pwd
RUN ls
RUN ls glorious-server

WORKDIR /glorious-server/ts-server

RUN ls src
RUN ls grrs
RUN ls grrs/target
RUN ls grrs/target/release

ENV PORT 8080
EXPOSE 8080

CMD ["npm", "run", "server"]
