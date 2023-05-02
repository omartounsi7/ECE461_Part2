# Use an official Rust runtime as a parent image
FROM rust:1.54-slim AS builder


# Copy the current directory contents into the container at /app
COPY . /ts-server

RUN ls /ts-server

# Builds Rust
WORKDIR /ts-server/grrs
RUN cargo build --release
