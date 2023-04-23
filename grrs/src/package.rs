use std::fmt;
use std::collections::HashMap;
use ordered_float::OrderedFloat;

use regex::Regex;
use lazy_static::lazy_static;

use reqwest;
use serde::{Serialize, Deserialize};
use serde_json;

use log::{info, debug};
use serde_json::json;


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
    pub code_review: f32,
    pub version_pinning: f32
}


#[allow(non_snake_case)]
#[derive(Serialize, Deserialize)]
pub struct PackageJSON {
    pub URL: String,
    pub NET_SCORE: f32,
    pub RAMP_UP_SCORE: f32,
    pub CORRECTNESS_SCORE: f32,
    pub BUS_FACTOR_SCORE: f32,
    pub RESPONSIVE_MAINTAINER_SCORE: f32,
    pub LICENSE_SCORE: f32,
    pub CODE_REVIEW: f32,
    pub Version_Pinning: f32,
}


impl PackageJSON {
    pub fn new(package: &Package) -> PackageJSON {
        PackageJSON {
            URL: package.url.get_url(),
            NET_SCORE: (*package.net_score * 100.0).round() / 100.0,
            RAMP_UP_SCORE: (*package.ramp_up * 100.0).round() / 100.0,
            CORRECTNESS_SCORE: (*package.correctness * 100.0).round() / 100.0,
            BUS_FACTOR_SCORE: (*package.bus_factor * 100.0).round() / 100.0,
            RESPONSIVE_MAINTAINER_SCORE: (*package.responsiveness * 100.0).round() / 100.0,
            LICENSE_SCORE: (*package.license * 100.0).round() / 100.0,
            CODE_REVIEW: (*package.review * 100.0).round() / 100.0,
            Version_Pinning: (*package.version_pinning * 100.0).round() / 100.0
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
    pub version_pinning: OrderedFloat<f32>,
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
            url: URLHandler::new(url),
            version_pinning: OrderedFloat(-1.0),
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
        debug!("Version pinning:  {}", self.version_pinning);
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
        self.net_score = OrderedFloat(0.4) * self.bus_factor + OrderedFloat(0.15) * (self.responsiveness + self.correctness + self.ramp_up + self.license);
        self.version_pinning = OrderedFloat(json.version_pinning);
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
        URLHandler {
            url: url.clone(),
            owner_repo: owner_repo
        }
    }


    fn determine_owner_repo(url: &String) -> String{
        lazy_static! {
            static ref GIT_RE:Regex = Regex::new(r#".+github\.com/(.+)"#).unwrap();
            static ref NPM_RE:Regex = Regex::new(r#"https://www\.npmjs\.com/package/(.+)"#).unwrap();
            static ref GIT_NPM_RE:Regex = Regex::new(r#".+github\.com/(.+).git"#).unwrap();
        }

        if GIT_RE.is_match(url) {
            info!("{} is a github URL!", url);
            // let owner_repo = GIT_RE.captures(url);
            let owner_repo_res = GIT_RE.captures(url);
            if owner_repo_res.is_none() {
                info!("GIT_RE regex capture failed to parse 'owner_repo'");
            }
            let owner_repo = owner_repo_res.unwrap();
            info!("{} is the owner repo!", &owner_repo[1]);
            (&owner_repo[1]).to_string()

        } else if NPM_RE.is_match(url) {
            info!("{} is NOT a github URL!", url);
            // let cap = NPM_RE.captures(url).unwrap();
            let cap_res = NPM_RE.captures(url);
            if cap_res.is_none() {
                info!("NPM_RE regex capture failed to parse 'owner_repo'");
            }
            let cap = cap_res.unwrap();

            let npm_url = format!("https://registry.npmjs.org/{}", &cap[1]);

            // let response = reqwest::blocking::get(npm_url).unwrap();
            let response_res = reqwest::blocking::get(npm_url);
            if response_res.is_err() {
                info!("Failed to get response from npm url!");
                info!("Returning Garbage!");
                "GARBAGE".to_string()
            }
            let response = response.unwrap();

            // let json = response.json::<NpmJSON>().unwrap();
            let json_res = response.json::<NpmJSON>();
            if json_res.is_none() || json_res.is_err() {
                info!("Failed to parse json from npm url");
                info!("Returning Garbage");
                "GARBAGE".to_string()
            }
            let json = json_res.unwrap();

            // let git_url_from_npm = json.repository.get("url").unwrap();
            let git_url_from_npm_res = json.repository.get("url");
            if git_url_from_npm_res.is_err() || git_url_from_npm_res.is_none() {
                info!("Failed to get github url from npm request");
                info!("Returning Garbage");
                "GARBAGE".to_string()
            }
            let git_url_from_npm = git_url_from_npm_res.unwrap();

            debug!("Git URL: {}", &git_url_from_npm);

            // let owner_repo = GIT_NPM_RE.captures(&git_url_from_npm).unwrap();
            let owner_repo_res = GIT_NPM_RE.captures(&git_url_from_npm);
            if owner_repo_res.is_none() || owner_repo_res.is_err() {
                info!("Failed to parse owner repo from npm request");
                info!("Returning Garbage");
                "GARBAGE".to_string()
            }

            info!("{} is the owner repo!", &owner_repo[1]);
            // owner repo found successfully
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

    let result = open as f32 / (open + closed) as f32;

    result
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

    let result = 0.25 * wiki + 0.25 * discussions + 0.25 * pages + 0.25 * readme;

    result
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
            code_review: 0.0,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
            version_pinning: 0.2
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
            code_review: 0.0,
            closed_issues: 20,
            total_commits: 20,
            bus_commits: 30,
            correctness_score: 0.3,
            version_pinning: 0.2
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
            code_review: 0.0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
            version_pinning: 0.2
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
            code_review: 0.0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
            version_pinning: 0.2
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
            code_review: 0.0,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
            version_pinning: 0.2
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
            code_review: 0.0,
            correctness_score: 0.3,
            license_score: 0.5,
            has_wiki: true,
            has_discussions: false,
            has_pages: true,
            has_readme: false,
            version_pinning: 0.2
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

