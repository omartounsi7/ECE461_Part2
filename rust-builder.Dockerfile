# Use an official Node.js runtime as a parent image
FROM node:14-slim

# Copy the current directory contents into the container at /app
COPY . /glorious-server

# Install dependencies
RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get install -y curl \
    && apt-get install -y pkg-config \
    && apt-get install -y libssl-dev

# Install dependencies
RUN apt-get update \
    && apt-get install -y python3-pip \
    && apt-get install -y libssl-dev

RUN ls /glorious-server/ts-server
RUN ls /glorious-server/ts-server/grrs

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Builds Rust
WORKDIR /glorious-server/ts-server/grrs
RUN cargo build --release
