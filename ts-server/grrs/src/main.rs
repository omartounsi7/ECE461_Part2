use grrs::handle_url_file;
use std::env;
mod package;


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

