# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the current directory contents into the container at /app
COPY . /glorious-server

RUN ls /glorious-server

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Builds Rust
WORKDIR /glorious-server/ts-server/grrs
RUN cargo build --release
