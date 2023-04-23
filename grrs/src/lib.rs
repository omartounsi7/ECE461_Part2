use std::env;
use std::path::Path;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};

mod package;
use package::Package;
use package::PackageJSON;

use pyo3::prelude::*;

use std::collections::BinaryHeap;

use serde_json;

use log::LevelFilter;
use log::{info, debug};



// CHANGE MADE HERE
// no_mangle is used so this function can be called after
// it has been compiled into a library
///
/// handle_url_file
///
/// Takes a file with links to repositories where each
/// link is seperated by a new line.
/// Urls should be from github or npmjs. If any are not
/// this function will fail.
/// Calls python functions from ./api.py to get the metrics
/// by invoking the api github or npmjs.
///
/// # Arguments
///
/// * 'url_file_path' - path to file containing urls to process
/// * 'log_path'      - path to file where the logs should be saved
/// * 'log_level'     - the level of logging that should be done
///                     log level 1: log info
///                   - log level 2: log debug
///
/// # Examples
///
/// ```
/// handle_url_file("path/to/urls.txt", "path/to/logs.txt", 1);
/// ```
///
#[no_mangle]
pub extern fn handle_url_file(url_file_path: String, log_path: String, log_level: i32){
    // set the log level based on the
    // log_level integer
    let level: LevelFilter;
    if log_level == 2 {
        level = LevelFilter::Debug;
    } else if log_level == 1 {
        level = LevelFilter::Info;
    } else {
        level = LevelFilter::Off;
    }

    // create log file
    let result = File::create(&log_path);

    // check if log file is
    match result {
        Ok(..) => {
            let log_res = simple_logging::log_to_file(log_path.clone(), level);
            if log_res.is_ok() {
                log_res.unwrap();
            }
        }
        Err(_e) => {
            simple_logging::log_to_stderr(level);
            eprint!(format!("Failed to open log file '{}'!", log_path.clone()));
            eprint!("Nothing will be logged!");
        }
    }

    // log url file
    info!("URL File to run {}", url_file_path);

    // check if url file path is not empty
    if url_file_path.is_empty() {
        info!("Invalid URL file path!");
    }

    // get path of url file
    let path = Path::new(url_file_path.as_str());

    let file_result = File::open(path); // Open the path in read-only mode, returns `io::Result<File>`
    // error handling
    let _file = match file_result  {
        Ok(_file) => {
            debug!("File handled Properly");
            let reader = BufReader::new(_file);
            let mut heap = BinaryHeap::<Package>::new();
             // CHANGE MADE HERE

            // let mut output_file = File::create("metrics.txt").unwrap();

            let output_file_res = File::create("metrics.txt");

            // error check file open
            if output_file_res.is_err() {
                info!("Failed to create output file!");
            }

            let mut output_file = output_file_res.unwrap();

            let mut reader_lines = reader.lines();
            for (index, line) in reader_lines.enumerate() {
                if line.is_err() {
                    info!("error in reading line at index {}", index);
                }

                let line = line.unwrap();

                // log the index and line
                info!("{}. {}", index + 1, line);

                // initialize object
                // might not be needed (or it might be)
                let mut package = Package::new(line);
                let python_code = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/api.py"));

                // log package to be constructed
                let package_url_string = package.url.get_url();
                info!("Constructed Package {}", package_url_string);
                debug!("Running Python");

                // run the python code to calculate the metrics
                // returns the results, but we need to check if it has calculated them successfully
                let result = Python::with_gil(|py| -> Result<String, PyErr> {
                    let code = PyModule::from_code(py, python_code, "", "").unwrap();
                    let temp: String = code.getattr("getData")?.call1((package.url.get_owner_repo(),))?.extract()?;
                    Ok(temp)
                });
                debug!("Python returned successfully");
                if result.is_err() {
                    info!("Python code returned an error!");
                }
                let json = result.unwrap();
                package.calc_metrics(&json);
                heap.push(package);
            }
            while !heap.is_empty() {
                // let temp = heap.pop().unwrap();
                let res = heap.pop();
                // checks if result is none
                if res.is_none() {
                    info!("Popped a None value from the heap!");
                }
                let temp = res.unwrap();
                temp.debug_output();
                let json = PackageJSON::new(&temp);
                if json.is_none() {
                    info!("Failed to parse json value using PackageJSON::new()");
                }
                let json_string = serde_json::to_string(&json).unwrap();
                // CHANGE MADE HERE
                writeln!(output_file, "{}", json_string).unwrap(); // write to output file
            }
        }
        Err(err) => {
            info!("Problem opening the file: {:?}", err);
        },
    };
}



///
/// module tests
///
/// Contains all of the tests we run in Rust
///
/// Current tests:
/// test_main -                      tests the main function from 'main.rs' by
///                                  calling the function handle_url_file with a log level of 3
/// test_handle_url_file_loglevel1 - tests the handle_url_file function by calling it with a
///                                  log level of 1
/// test_handle_url_file_loglevel2 - tests the handle_url_file function by calling it with a
///                                  log level of 2
/// test_handle_url_file_loglevel3 - tests the handle_url_file function by calling it with a
///                                  log level of 3
///
#[cfg(test)]
mod tests {
    use super::*;

    // tests the main function
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

    // tests the 'test_handle_url_file' function
    // using log level 1
    // this should output debug logs
    #[test]
    fn test_handle_url_file_loglevel1() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 1;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
    }

    // tests the 'test_handle_url_file' function
    // using log level 2
    // this should only output info logs
    #[test]
    fn test_handle_url_file_loglevel2() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 2;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
    }

    // tests the 'test_handle_url_file' function
    // using log level 3
    // this should not give any logs
    #[test]
    fn test_handle_url_file_loglevel3() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 3;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
    }
}

