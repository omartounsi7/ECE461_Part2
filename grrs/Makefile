export LOG_FILE
export LOG_LEVEL

run:
	./target/debug/metric ../URLs.txt $(LOG_FILE) $(LOG_LEVEL)

build:
	cargo build

api:
	python3 api.py

install:
	cargo install grcov

test:
	CARGO_INCREMENTAL=0 RUSTFLAGS='-Cinstrument-coverage' LLVM_PROFILE_FILE='cargo-test-%p-%m.profraw' cargo test &
	grcov . --binary-path ./target/debug/deps/ -s . -t html --branch --ignore-not-existing --ignore '../*' --ignore "/*" -o target/coverage/html
