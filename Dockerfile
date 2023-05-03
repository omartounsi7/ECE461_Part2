# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the binary file from the Rust builder container
COPY --from=ts-builder /epic-server /grandiose-server

WORKDIR /grandiose-server/ts-server

RUN pwd
RUN ls
RUN ls src
RUN cat src/index.js

ENV PORT 8080
EXPOSE 8080

CMD ["npm", "run", "server"]
