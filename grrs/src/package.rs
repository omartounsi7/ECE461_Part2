use std::fmt;
use std::collections::HashMap;
use ordered_float::OrderedFloat;

use regex::Regex;
use lazy_static::lazy_static;

use reqwest;
use serde::{Serialize, Deserialize};
use serde_json;

use log::{info, debug};

#[derive(Deserialize)]
pub struct NpmJSON {
    repository:  HashMap<String, String>,
}

#[derive(Deserialize)]
pub struct MetricJSON {
    pub license_score:  f32,

    pub open_issues: i32,
    pub closed_issues: i32,

    pub has_wiki: bool,
    pub has_discussions: bool,
    pub has_readme: bool,
    pub has_pages: bool,

    pub total_commits: i32,
    pub bus_commits: i32,

    pub correctness_score: f32,
    pub code_review: f32
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
pub struct PackageJSON {
    pub URL: String,
    pub NetScore: f32,
    pub RampUp: f32,
    pub Correctness: f32,
    pub BusFactor: f32,
    pub ResponsiveMaintainer: f32,
    pub License: f32,
    pub CodeReview: f32
}

impl PackageJSON {
    pub fn new(package: &Package) -> PackageJSON {
        PackageJSON {
            URL: package.url.get_url(),
            NetScore: (*package.net_score * 100.0).round() / 100.0,
            RampUp: (*package.ramp_up * 100.0).round() / 100.0,
            Correctness: (*package.correctness * 100.0).round() / 100.0,
            BusFactor: (*package.bus_factor * 100.0).round() / 100.0,
            ResponsiveMaintainer: (*package.responsiveness * 100.0).round() / 100.0,
            License: (*package.license * 100.0).round() / 100.0,
            CodeReview: (*package.review * 100.0).round() / 100.0
        }
    }
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub struct Package {
    pub net_score: OrderedFloat<f32>,
    pub ramp_up: OrderedFloat<f32>,
    pub correctness: OrderedFloat<f32>,
    pub bus_factor: OrderedFloat<f32>,
    pub responsiveness: OrderedFloat<f32>,
    pub license: OrderedFloat<f32>,
    pub review: OrderedFloat<f32>,
    pub url: URLHandler,
}

impl Package {
    pub fn new(url: String) -> Package{
        Package {
            net_score: OrderedFloat(-1.0),
            ramp_up: OrderedFloat(-1.0),
            correctness: OrderedFloat(-1.0),
            bus_factor: OrderedFloat(-1.0),
            responsiveness: OrderedFloat(-1.0),
            license: OrderedFloat(-1.0),
            review: OrderedFloat(-1.0),
            url: URLHandler::new(url)
        }
    }

    pub fn debug_output(&self) { 
        debug!("");
        debug!("Package URL:            {}", self.url.get_url());
        debug!("Owner/Repo:             {}", self.url.get_owner_repo());
        debug!("Total score:            {}", self.net_score);
        debug!("Bus Factor:             {}", self.bus_factor);
        debug!("ResponsiveMaintainer:   {}", self.responsiveness);
        debug!("Correctness:            {}", self.correctness);
        debug!("Code Review:            {}", self.review);
        debug!("Ramp Up Time:           {}", self.ramp_up);
        debug!("License Compatibility:  {}", self.license);
        debug!("");
    }

    pub fn calc_metrics(&mut self, json_in: &String){
        // we deserialize our json object into MetricJSON struct
        let json: MetricJSON = serde_json::from_str(json_in).expect("Unable to parse JSON");
        self.bus_factor = OrderedFloat(calc_bus_factor(&json));
        self.responsiveness = OrderedFloat(calc_responsiveness(&json));
        self.correctness = OrderedFloat(json.correctness_score);
        self.ramp_up = OrderedFloat(calc_ramp_up_time(&json));
        self.license = OrderedFloat(json.license_score);
        self.review = OrderedFloat(json.code_review);
        self.net_score = OrderedFloat(0.4) * self.bus_factor + OrderedFloat(0.15) * (self.responsiveness + self.correctness + self.ramp_up + self.license)
    }

}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub struct URLHandler {
    pub url: String,
    pub owner_repo: String
}


impl URLHandler {

    pub fn new(url: String) -> URLHandler{
        let owner_repo = URLHandler::determine_owner_repo(&url);
        URLHandler {url: url.clone(), owner_repo: owner_repo}
    }

    fn determine_owner_repo(url: &String) -> String{
        lazy_static! {
            static ref GIT_RE:Regex = Regex::new(r#".+github\.com/(.+)"#).unwrap();
            static ref NPM_RE:Regex = Regex::new(r#"https://www\.npmjs\.com/package/(.+)"#).unwrap();
            static ref GIT_NPM_RE:Regex = Regex::new(r#".+github\.com/(.+).git"#).unwrap();
        }
        if GIT_RE.is_match(url) {
            info!("{} is a github URL!", url);
            let owner_repo = GIT_RE.captures(url).unwrap();
            info!("{} is the owner repo!", &owner_repo[1]);
            (&owner_repo[1]).to_string()
        } else if NPM_RE.is_match(url) {
            info!("{} is NOT a github URL!", url);
            let cap = NPM_RE.captures(url).unwrap();
            let npm_url = format!("https://registry.npmjs.org/{}", &cap[1]);
            let response = reqwest::blocking::get(npm_url).unwrap();
            let json = response.json::<NpmJSON>().unwrap();
            let git_url_from_npm = json.repository.get("url").unwrap();
            debug!("Git URL: {}", &git_url_from_npm);
            let owner_repo = GIT_NPM_RE.captures(&git_url_from_npm).unwrap();
            info!("{} is the owner repo!", &owner_repo[1]);
            (&owner_repo[1]).to_string()
        } else {
            info!("Supplied URL is not npm or github! Returning Garbage!");
            "GARBAGE".to_string()
        }
    }
    pub fn get_url(&self) -> String{
        self.url.clone()
    }
    pub fn get_owner_repo(&self) -> String{
        self.owner_repo.clone()
    }
}

impl fmt::Display for URLHandler {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.url)
    }
}

pub fn calc_bus_factor(json: &MetricJSON) -> f32 {
    let total_commits : i32 = json.total_commits;
    let top_contributor_commits : i32 = json.bus_commits;
    let ratio : f32 = top_contributor_commits as f32 / total_commits as f32;
    debug!("top_contributor_commits: {}", &top_contributor_commits);
    debug!("total_commits:           {}", &total_commits);
    debug!("ratio:                   {}", &ratio);
    1.0 - ratio
}

pub fn calc_responsiveness(json: &MetricJSON) -> f32 {
    let open: i32 = json.open_issues + 50;
    let closed: i32 = json.closed_issues + 50;
    debug!("open_issues:    {}", &open);
    debug!("closed_issues:  {}", &closed);
    open as f32 / (open + closed) as f32
}

pub fn calc_ramp_up_time(json: &MetricJSON) -> f32 {
    let wiki:        f32 = (json.has_wiki as i32)        as f32;
    let discussions: f32 = (json.has_discussions as i32) as f32;
    let pages:       f32 = (json.has_pages as i32)       as f32;
    let readme:      f32 = (json.has_readme as i32)      as f32;
    debug!("wiki:         {}", &wiki);
    debug!("discussions:  {}", &discussions);
    debug!("pages:        {}", &pages);
    debug!("readme:       {}", &readme);
    0.25 * wiki + 0.25 * discussions + 0.25 * pages + 0.25 * readme
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_calc_ramp_up_time_fail() {//supposed to fail and fails correctly
        let metric_json = MetricJSON {
            has_wiki: true,
            has_discussions: true,
            has_pages: false,
            has_readme: true,
            license_score: 0.5,
            open_issues: 20,
            closed_issues: 20,
            code_review: 0,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
        };
        let ramp_up_time = calc_ramp_up_time(&metric_json);
        assert_ne!(ramp_up_time, 1.0);
    }
    #[test]
    fn test_calc_ramp_up_time_pass() { //supposed to pass and passes correctly
        let json = MetricJSON {
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
            license_score: 0.5,
            open_issues: 20,
            code_review: 0,
            closed_issues: 20,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
        };

        let result = calc_ramp_up_time(&json);
        assert_eq!(result, 0.5);
    }
    #[test]
    fn test_calc_responsiveness_failing() {
        let json = MetricJSON {
            open_issues: 10,
            closed_issues: 50,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
            license_score: 0.5,
            code_review: 0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
        };
        // This assert will fail because the expected value is not equal to the actual value of 0.375.
        assert_ne!(calc_responsiveness(&json), 0.4);
    }
    #[test]
    fn test_calc_responsiveness_success() {
        let json = MetricJSON {
            open_issues: 100,
            closed_issues: 200,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
            license_score: 0.5,
            code_review: 0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
        };
        assert_eq!(calc_responsiveness(&json), 0.375);
    }
    #[test]
    fn test_calc_bus_factor_fail() { //should be 0.5
        let json = MetricJSON {
            total_commits: 100,
            bus_commits: 50,
            open_issues: 100,
            closed_issues: 200,
            correctness_score: 0.3,
            license_score: 0.5,
            code_review: 0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
        };
        let result = calc_bus_factor(&json);
        assert_ne!(result, 2.0);
    }
    #[test]
    fn test_calc_bus_factor_pass() { //should be 0.5
        let json = MetricJSON {
            total_commits: 80,
            bus_commits: 50,
            open_issues: 100,
            closed_issues: 200,
            code_review: 0,
            correctness_score: 0.3,
            license_score: 0.5,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
        };
        let result = calc_bus_factor(&json);
        assert_eq!(result, 0.375);
    }
    #[test]
    fn test_url_handler_github() {
        let url = "https://github.com/openai/gpt-3".to_string();
        let handler = URLHandler::new(url.clone());
        assert_eq!(handler.get_url(), url);
        assert_eq!(handler.get_owner_repo(), "openai/gpt-3");
    }
    #[test]
    fn test_url_handler_npm() {
        let url = "https://www.npmjs.com/package/request".to_string();
        let handler = URLHandler::new(url.clone());
        assert_eq!(handler.get_url(), url);
        assert_eq!(handler.get_owner_repo(), "request/request");
    }
    

}




