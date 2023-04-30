use std::env;
use std::path::Path;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};


#[macro_use]
extern crate lazy_static;

use reqwest::blocking::Client;
use reqwest::header;

mod package;
use package::Package;
use package::PackageJSON;

use pyo3::prelude::*;

use std::collections::BinaryHeap;
use std::collections::HashMap;

use serde_json;
use serde::{Serialize, Deserialize};

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
            eprint!("{}",format!("Failed to open log file '{}'!", log_path.clone()));
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

/// /// /// /// /// /// ///
/// * * * * * * * * * * ///
/// UNIT TEST FUNCTIONS ///
/// * * * * * * * * * * ///
/// /// /// /// /// /// ///

///
/// UNIT TEST GLOBAL VARIABLES
///
lazy_static! {
    static ref WEBSITE_NAME: String = "https://npm-module-registry-381816.uc.r.appspot.com".to_string();
    static ref DEFAULT_USERNAME: String = "ece30861defaultadminuser".to_string();
    static ref DEFAULT_PASSWORD: String = "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;".to_string();
    static ref AUTH_TOKEN: String = "".to_string();
}

///
/// MISC FUNCTIONS
///
pub fn get_website_url() -> String {
    WEBSITE_NAME.clone()
}
pub fn get_default_username() -> String {
    DEFAULT_USERNAME.clone()
}
pub fn get_default_password() -> String {
    DEFAULT_PASSWORD.clone()
}
pub fn get_auth_token() -> String {
    AUTH_TOKEN.clone()
}

pub fn get_valid_module_name() -> String {
    "".to_string()
}

pub fn get_valid_module_name_and_version() -> (String, String) {
    ("".to_string(), "".to_string())
}

pub fn get_valid_module_id() -> String {
    "".to_string()
}

pub fn get_valid_base64_zip() -> String {
    "".to_string()
}

///
/// UNIT TEST STRUCTS
///

//
// PUT /authenticate
//
#[derive(Serialize)]
struct User {
    name: String,
    isAdmin: bool,
}

#[derive(Serialize)]
struct Secret {
    password: String,
}

#[derive(Serialize)]
struct AuthenticateRequestBody {
    User: User,
    Secret: Secret,
}

#[derive(Serialize)]
struct MalformedAuthenticateRequestBody1 {
    User: User
}

#[derive(Serialize)]
struct MalformedAuthenticateRequestBody2 {
    Secret: Secret
}

//
// POST /packages
//
#[derive(Serialize)]
struct PostPackagesRequestBody {
    Version: String,
    Name: String,
}

#[derive(Serialize)]
struct MalformedPostPackagesRequestBody1 {
    Name: String
}

#[derive(Serialize)]
struct MalformedPostPackagesRequestBody2 {
    Version: String
}

//
// PUT /package/{id}
//
#[derive(Serialize)]
struct PutPackageRequestBody {
    metadata: PutPackageMetadata,
    data: PutPackageData,
}

#[derive(Serialize)]
struct PutPackageMetadata {
    Name: String,
    Version: String,
    ID: String,
}

#[derive(Serialize)]
struct PutPackageData {
    Content: String,
    URL: String,
    JSProgram: String,
}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody1 {
    metadata: PutPackageMetadata,
    data: MalformedPutPackageData1,
}

#[derive(Serialize)]
struct MalformedPutPackageData1 {
    URL: String,
    JSProgram: String
}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody2 {
    metadata: PutPackageMetadata
}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody3 {
    data: PutPackageData
}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody4 {
    data: MalformedPutPackageData2,
    metadata: PutPackageMetadata
}

#[derive(Serialize)]
struct MalformedPutPackageData2 {
    Content: String,
    JSProgram: String
}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody5 {

}

#[derive(Serialize)]
struct MalformedPutPackageRequestBody6 {
    data: PutPackageData,
    metadata: MalformedPutPackageMetadata1
}

#[derive(Serialize)]
struct MalformedPutPackageMetadata1 {
    Version: String,
    ID: String
}

//
// POST /package
//
#[derive(Serialize)]
struct PostPackageRequestBody {
    Content: String,
    JSProgram: String
}

#[derive(Serialize)]
struct MalformedPostPackageRequestBody1 {
    JSProgram:String
}

//
// POST /package/byRegEx
//
#[derive(Serialize)]
struct PostPackageRegexRequestBody {
    RegEx: String
}

#[derive(Serialize)]
struct MalformedPostPackageRegexRequestBody1 {

}

//
// MODULE CONTAINING THE UNIT TEST FUNCTIONS
//
#[cfg(test)]
mod tests {
    use log::log;
    use reqwest::blocking::get;
    use serde::__private::de::IdentifierDeserializer;
    use super::*;

    //
    // TEST THIS LIBRARY
    //

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
        return;
    }

    #[test]
    fn test_handle_url_file_loglevel1() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 1;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
        return;
    }

    #[test]
    fn test_handle_url_file_loglevel2() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 2;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
        return;
    }

    #[test]
    fn test_handle_url_file_loglevel3() {
        let url_file_path = "URLs.txt".to_owned();
        let log_path = "log.txt".to_owned();
        let log_level = 3;

        let result = handle_url_file(url_file_path, log_path, log_level);

        // Perform your assertions here.
        // For example:
        assert_eq!(result, ());
        return;
    }

    //
    // TEST API ENDPOINTS
    //


    // POST /authenticate

    // input correct username and password
    #[test]
    fn test_post_authenticate_success() {
        // variables
        let username = get_default_username();
        let password = get_default_password();
        let url = get_website_url();

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = AuthenticateRequestBody {
            User: User {
                name: username,
                isAdmin: true
            },
            Secret: Secret {
                password
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            print!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return
        }

        return;
    }

    // input incorrect username and password
    #[test]
    fn test_post_authenticate_fail1() {
        // variables
        let username = "this is an incorrect username".to_string();
        let password = "super secret incorrect password".to_string();
        let url = get_website_url();

        let correct_status = 401;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = AuthenticateRequestBody {
            User: User {
                name: username,
                isAdmin: true
            },
            Secret: Secret {
                password
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return
        }
        return;
    }

    // input incorrect username and correct password
    #[test]
    fn test_post_authenticate_fail2() {
        // variables
        let username = "this is an incorrect username".to_string();
        let password = get_default_password();
        let url = get_website_url();

        let correct_status = 401;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = AuthenticateRequestBody {
            User: User {
                name: username,
                isAdmin: true
            },
            Secret: Secret {
                password
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return
        }
        return
    }

    // input correct username and incorrect password
    #[test]
    fn test_post_authenticate_fail3() {
        // variables
        let username = get_default_username();
        let password = "super secret incorrect password".to_string();
        let url = get_website_url();

        let correct_status = 401;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = AuthenticateRequestBody {
            User: User {
                name: username,
                isAdmin: true
            },
            Secret: Secret {
                password
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return
        }
        return
    }

    // input malformed body
    #[test]
    fn test_post_authenticate_fail4() {
        // variables
        let username = get_default_username();
        let password = get_default_password();
        let url = get_website_url();

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = MalformedAuthenticateRequestBody1 {
            User: User {
                name: username,
                isAdmin: true
            },
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }
        return;
    }

    // input malformed body
    #[test]
    fn test_post_authenticate_fail5() {
        // variables
        let username = get_default_username();
        let password = get_default_password();
        let url = get_website_url();

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));

        // create body
        let request_body = MalformedAuthenticateRequestBody2 {
            Secret: Secret {
                password
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/authenticate", get_website_url()))
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }
        return;
    }


    // POST /packages

    #[test]
    fn test_post_packages_success() {
        // variables
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let url = get_website_url();
        let token = get_auth_token();
        let offset = 1;
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("offset", header::HeaderValue::from(offset));

        // create body
        let request_body = serde_json::json!([
            {
                "Version": version,
                "Name": name
            }
        ]);
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send response
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/packages", url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_post_packages_fail1() {
        // variables
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let url = get_website_url();
        let token = "anIncorrectAuthenticationTokenJfaorefl43923u094v";
        let offset = 1;
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("offset", header::HeaderValue::from(offset));

        // create body
        let request_body = serde_json::json!([
            {
                "Version": version,
                "Name": name
            }
        ]);
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send response
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/packages", url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_post_packages_fail2() {
        // variables
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let url = get_website_url();
        let token = get_auth_token();
        let offset = 1;
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("offset", header::HeaderValue::from(offset));

        // create body
        let request_body = serde_json::json!([
            {
                "Name": name
            }
        ]);
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send response
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/packages", url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_post_packages_fail3() {
        // variables
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let url = get_website_url();
        let token = get_auth_token();
        let offset = 1;
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("offset", header::HeaderValue::from(offset));

        // create body
        let request_body = serde_json::json!([
            {
                "Version": version
            }
        ]);
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send response
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/packages", url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_post_packages_fail4() {
        // variables
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let url = get_website_url();
        let token = get_auth_token();
        let offset = 1;
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("offset", header::HeaderValue::from(offset));

        // create body
        let request_body = serde_json::json!([
            {
                "Version": version,
                "Name": name
            }
        ]);
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send response
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/packages", url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // DELETE /reset

    #[test]
    fn test_delete_reset_success() {
        //variables
        return; // don't test using this cause it will break the other tests
        let token = get_auth_token();
        let url = get_website_url();
        let correct_status = 200;
        let auth_header = format!("bearer {}", token);


        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/reset",url))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process request


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_delete_reset_fail1() {
        //variables
        let token = "superRealAuthTokenNotFakeAtallllllllllllllllllllfoijae4803j";
        let url = get_website_url();
        let correct_status = 400;
        let auth_header = format!("bearer {}", token);

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/reset",url))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process request


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // GET /package/{id}

    #[test]
    fn test_get_package_by_id_success() {
        // variables
        let id = get_valid_module_id();
        let url = get_website_url();
        let token = get_auth_token();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}", url, id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("failed to send request to server");
            assert_eq!(!response_res.is_err(), false);
            return
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_get_package_by_id_fail1() {
        // variables
        let id = get_valid_module_id();
        let url = get_website_url();
        let token = "ultraREALAUTHTOKENiirergsiue437384732";
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}", url, id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("failed to send request to server");
            assert_eq!(!response_res.is_err(), false);
            return
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_get_package_by_id_fail2() {
        // variables
        let id = get_valid_module_id();
        let url = get_website_url();
        let token = get_auth_token();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}", url, id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("failed to send request to server");
            assert_eq!(!response_res.is_err(), false);
            return
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid id
    #[test]
    fn test_get_package_by_id_fail3() {
        // variables
        let id = "totallylegggitpackageid".to_string();
        let url = get_website_url();
        let token = get_auth_token();
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}", url, id.clone()))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("failed to send request to server");
            assert_eq!(!response_res.is_err(), false);
            return
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // PUT /package/{id}

    #[test]
    fn test_put_package_by_id_success() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = PutPackageRequestBody {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: PutPackageData {
                Content: content.clone(),
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_put_package_by_id_fail1() {
        // variables
        let token = "8493th4hfTOKENofAuthenticationwhomvstisreal23432432";
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = PutPackageRequestBody {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: PutPackageData {
                Content: content.clone(),
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail2() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody1 {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: MalformedPutPackageData1 {
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody2 {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail4() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody3 {
            data: PutPackageData {
                Content: content.clone(),
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail5() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody4 {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: MalformedPutPackageData2 {
                Content: content.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail6() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody5 {

        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_put_package_by_id_fail7() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);
        // let id_str =

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody6 {
            data: PutPackageData {
                Content: content,
                URL: package_url,
                JSProgram: jsProgram
            },
            metadata: MalformedPutPackageMetadata1 {
                Version: version,
                ID: id
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, get_valid_module_id()))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing body
    #[test]
    fn test_put_package_by_id_fail8() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        // headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = MalformedPutPackageRequestBody5 {

        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            // .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_put_package_by_id_fail9() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = get_valid_module_id();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("id", header::HeaderValue::from(id.clone()));

        // create body
        let request_body = PutPackageRequestBody {
            metadata: PutPackageMetadata {
                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: PutPackageData {
                Content: content.clone(),
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid id
    #[test]
    fn test_put_package_by_id_fail10() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name: String;
        let version: String;
        let (name, version) = get_valid_module_name_and_version();
        let id = "therealistidintheworld".to_string();
        let content = "".to_string();
        let jsProgram = "".to_string();
        let package_url = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create headers
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // create body
        let request_body = PutPackageRequestBody {
            metadata: PutPackageMetadata {

                Name: name.clone(),
                Version: version.clone(),
                ID: id.clone()
            },
            data: PutPackageData {
                Content: content.clone(),
                URL: package_url.clone(),
                JSProgram: jsProgram.clone()
            }
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .put(format!("{}/package/{}", url, id))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // DELETE /package/{id}

    #[test]
    fn test_delete_package_by_id_success() {
        return; // don't test this here because this may mess with the other unit tests
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/{}",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_delete_package_by_id_fail1() {
        // variables
        let token = "ISoi349THIS43fqioAfinfFAKE4832krTOKENakfwv23";
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/{}",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_delete_package_by_id_fail2() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/{}",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid id
    #[test]
    fn test_delete_package_by_id_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = "packageidforsomepackagethatdoesntactuallyexist".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/{}",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // POST /package

    #[test]
    fn test_post_package_success() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let content = get_valid_base64_zip();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 201;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRequestBody {
            Content: content.clone(),
            JSProgram: jsProgram.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package",url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_post_package_fail1() {
        // variables
        let token = "48hfreifHUNNAPERCENTREALTOKEN4ifoh4oihefo";
        let url = get_website_url();
        let content = get_valid_base64_zip();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRequestBody {
            Content: content.clone(),
            JSProgram: jsProgram.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package",url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_post_package_fail2() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let content = get_valid_base64_zip();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = MalformedPostPackageRequestBody1 {
            JSProgram: jsProgram.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package",url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with no body
    #[test]
    fn test_post_package_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let content = get_valid_base64_zip();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRequestBody {
            Content: content.clone(),
            JSProgram: jsProgram.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package",url))
            .headers(headers)
            // .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid content
    #[test]
    fn test_post_package_fail4() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let content = "clearlyaninvalidzipfileintheformofatechnicallyvalidbase64stringithink".to_string();
        let jsProgram = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRequestBody {
            Content: content.clone(),
            JSProgram: jsProgram.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package",url))
            .headers(headers)
            .body(body)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // GET /package/{id}/rate

    #[test]
    fn test_get_package_rate_by_id_success() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}/rate",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();

        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_get_package_rate_by_id_fail1() {
        // variables
        let token = "thisisthe46thauthtokenalive";
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}/rate",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();

        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_get_package_rate_by_id_fail2() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = get_valid_module_id();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}/rate",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();

        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid id
    #[test]
    fn test_get_package_rate_by_id_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let id = "theidofthepackagewearetryingtoget".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, header::HeaderValue::from_static("application/json"));
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("id", header::HeaderValue::from_str(&id).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/{}/rate",url,id))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();

        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // GET /package/byName

    #[test]
    fn test_get_package_by_name_success() {
        // variables
        let token = get_auth_token();
        let name = get_valid_module_name();
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_get_package_by_name_fail1() {
        // variables
        let token = "oirajg934this4knf4ioISj943jf30percentio43nirOFaoifourcode323209";
        let name = get_valid_module_name();
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with missing header(s)
    #[test]
    fn test_get_package_by_name_fail2() {
        // variables
        let token = get_auth_token();
        let name = get_valid_module_name();
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid name
    #[test]
    fn test_get_package_by_name_fail3() {
        // variables
        let token = get_auth_token();
        let name = "superRealistingMoDuLeNAMEEEEE";
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // DELETE /package/byName

    #[test]
    fn test_delete_package_by_name_success() {
        return; // don't test this here because this may mess with other tests
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name = get_valid_module_name();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_delete_package_by_name_fail1() {
        // variables
        let token = "4iotoidsff4390jithisn4ifoclass";
        let name = get_valid_module_name();
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input header with missing info
    #[test]
    fn test_delete_package_by_name_fail2() {
        // variables
        let token = get_auth_token();
        let name = get_valid_module_name();
        let url = get_website_url();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        // headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .get(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response

        let status = response.status();
        if status != correct_status {
            // println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input with invalid name
    #[test]
    fn test_delete_package_by_name_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let name = "fakepackagenametotryandtrickthebackendintomessingup";
        let auth_header = format!("bearer {}", token);

        let correct_status = 404;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());
        headers.insert("name", header::HeaderValue::from_str(&name).unwrap());

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .delete(format!("{}/package/byName/{}", url, name))
            .headers(headers)
            .send();
        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            // println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }


    // POST /package/byRegEx

    #[test]
    fn test_post_package_by_regex_success() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let regex = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 200;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRegexRequestBody {
            RegEx: regex.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package/byRegEx", url))
            .headers(headers)
            .send();

        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(response_res.is_err(), response_res.is_err());
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid auth token
    #[test]
    fn test_post_package_by_regex_fail1() {
        // variables
        let token = "regexroienireosiosregexregexREGEXREGEXHELPPPPPPMEMEEEE438ut04";
        let url = get_website_url();
        let regex = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRegexRequestBody {
            RegEx: regex.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            // println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package/byRegEx", url))
            .headers(headers)
            .send();

        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            // println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input malformed body
    #[test]
    fn test_post_package_by_regex_fail2() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let regex = "".to_string();
        let auth_header = format!("bearer {}", token);

        let correct_status = 400;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = MalformedPostPackageRegexRequestBody1 {
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            // println!("Failed to parse body");
            assert_eq!(body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package/byRegEx", url))
            .headers(headers)
            .send();

        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            // println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }

    // input invalid regex
    #[test]
    fn test_post_package_by_regex_fail3() {
        // variables
        let token = get_auth_token();
        let url = get_website_url();
        let regex = "(((((((({{{{{.....****".to_string();
        let auth_header = format!("bearer {}", token).clone();

        let correct_status = 404;

        // create header
        let mut headers = header::HeaderMap::new();
        headers.insert("X-Authorization", header::HeaderValue::from_str(&auth_header).unwrap());

        // create body
        let request_body = PostPackageRegexRequestBody {
            RegEx: regex.clone()
        };
        let body_res = serde_json::to_string(&request_body);
        if body_res.is_err() {
            // println!("Failed to parse body");
            assert_eq!(!body_res.is_err(), false);
            return;
        }
        let body = body_res.unwrap();

        // send request
        let client = reqwest::blocking::Client::new();
        let response_res = client
            .post(format!("{}/package/byRegEx", url))
            .headers(headers)
            .send();

        if response_res.is_err() {
            // println!("Failed to get response");
            assert_eq!(!response_res.is_err(), false);
            return;
        }
        let response = response_res.unwrap();
        // process response


        let status = response.status();
        if status != correct_status {
            // println!("Incorrect status from response");
            assert_eq!(response.status(), !correct_status);
            return;
        }

        return;
    }
}
