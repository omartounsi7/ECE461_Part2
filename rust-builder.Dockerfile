# Use an official Rust runtime as a parent image
FROM rust:1.54-slim AS builder

RUN pwd
RUN ls

# Copy the current directory contents into the container at /app
COPY . /ts-server

RUN pwd
RUN ls

# Builds Rust
WORKDIR /ts-server/grrs
RUN cargo build --release
