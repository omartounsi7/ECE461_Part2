use std::env;
use std::path::Path;
use std::fs::File;
use std::io::{BufRead, BufReader};
mod package;
use package::Package;
use package::PackageJSON;
use pyo3::prelude::*;
use std::collections::BinaryHeap;
use serde_json;
use log::LevelFilter;
use log::{info, debug};

pub fn main(){

    let args: Vec<String> = env::args().collect(); //returns an iterator

    // Check the number of arguments
    if args.len() != 4 {
        println!("Usage: ./run task log_path log_level");
        return
    }

    let task = &args[1]; //stores what instruction will be run
    let log_path = &args[2]; //stores what instruction will be run
    let temp = &args[3]; //stores what instruction will be run
    let log_level: i32 = match temp.parse::<i32>() {
        Ok(n) => n,
        Err(_e) => 1,
    };
    handle_url_file(task.to_string(), log_path.to_string(), log_level);
}

pub fn handle_url_file(url_file_path: String, log_path: String, log_level: i32){
    let level: LevelFilter;
    if log_level == 2 {
        level = LevelFilter::Debug;
    } else if log_level == 1 {
        level = LevelFilter::Info;
    } else {
        level = LevelFilter::Off;
    }

    let result = File::create(&log_path);
    match result {
        Ok(..) => {
            simple_logging::log_to_file(log_path, level).unwrap();
        }
        Err(_e) => {
            simple_logging::log_to_stderr(level);
        }
    }

    info!("URL File to run {}", url_file_path);

    let path = Path::new(url_file_path.as_str());
    let file_result = File::open(path); // Open the path in read-only mode, returns `io::Result<File>`
    // error handling
    let _file = match file_result  {
        Ok(_file) => {
            debug!("File handled Properly");
            let reader = BufReader::new(_file);
            let mut heap = BinaryHeap::<Package>::new();
            for (index, line) in reader.lines().enumerate() {
                let line = line.unwrap(); // Ignore errors.
                info!("{}. {}", index + 1, line);

                // initialize object
                // might not be needed
                let mut package = Package::new(line);
                let python_code = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/api.py"));

                info!("Constructed Package {}", package.url.get_url());
                debug!("Running Python");
                let result = Python::with_gil(|py| -> Result<String, PyErr> {
                    let code = PyModule::from_code(py, python_code, "", "").unwrap();
                    let temp: String = code.getattr("getData")?.call1((package.url.get_owner_repo(),))?.extract()?;
                    Ok(temp)
                });
                debug!("Python returned successfully");
                let json = result.unwrap();
                package.calc_metrics(&json);
                heap.push(package);
            }
            while !heap.is_empty() {
                let temp = heap.pop().unwrap();
                temp.debug_output();
                let json = PackageJSON::new(&temp);
                let json_string = serde_json::to_string(&json).unwrap();
                println!("{}", json_string);
            }
        }
        Err(err) => info!("Problem opening the file: {:?}", err),
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main() {
        let _args = vec![
            "program_name".to_owned(),
            "task".to_owned(),
            "log_path".to_owned(),
            "3".to_owned(),
        ];

        let result = handle_url_file("task".to_owned(), "log_path".to_owned(), 3);
        assert_eq!(result, ());
    }

    #[test]
    fn test_handle_url_file() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 2;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
    }
}