# Use an official Rust runtime as a parent image
FROM rust:nightly-slim AS builder

RUN rustup update && \
    rustup target add x86_64-unknown-linux-musl && \
    cargo install --target x86_64-unknown-linux-musl --version 0.2.8 cargo-udeps && \
    cargo install --target x86_64-unknown-linux-musl --version 0.5.5 cargo-watch && \
    cargo install --target x86_64-unknown-linux-musl --version 0.3.1 cross

# Copy the current directory contents into the container at /app
COPY . /glorious-server

RUN ls /glorious-server

# Builds Rust
WORKDIR /glorious-server/ts-server/grrs
RUN cargo build --release
