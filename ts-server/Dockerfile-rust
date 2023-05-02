# Use an official Rust runtime as a parent image
FROM rust:1.54-slim AS builder

# Set the working directory to /app
WORKDIR /ts-server

# Copy the current directory contents into the container at /app
COPY . /ts-server

# Install dependencies
RUN apt-get update \
    && apt-get install -y build-essential \
    && apt-get install -y curl \
    && apt-get install -y pkg-config \
    && apt-get install -y libssl-dev

# Builds Rust
WORKDIR /ts-server/grrs
RUN cargo build --release
