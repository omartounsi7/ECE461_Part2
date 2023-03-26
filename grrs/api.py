from tempfile import TemporaryDirectory
import subprocess
import gql
import json
from gql.transport.requests import RequestsHTTPTransport
import os
import re
import requests
import base64
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def getRestData(owner, repo):
  token = os.getenv("GITHUB_TOKEN") #authentication 

  #making REST request
  url = "https://api.github.com/repos/{}/{}".format(owner, repo)
  headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}

  response = requests.get(url, headers=headers)

  response.raise_for_status()
  if response.status_code == 200:
    pretty_data = json.loads(response.text)

    #making second request for repository content
    contentURL = "https://api.github.com/repos/{}/{}/contents/".format(owner, repo)
    content_resp = requests.get(contentURL, headers=headers)
    content_resp.raise_for_status()
    if content_resp.status_code == 200:
      pretty_content = json.loads(content_resp.text)

      #get names of all files/directories
      names = [] 
      for i in range(len(pretty_content)): 
        names.append(pretty_content[i]["name"])

      test_score = 0.0 
      hasREADME = False   
      #if testing dir/file(s) present, set to 1
      if 'test'.casefold() in (name.casefold() for name in names):
        test_score = 1.0
      # if README in repo  
      if "README.md" in names: 
        hasREADME = True
      # getting more info (this plus hasREADME = ramp-up data)
      hasWiki = pretty_data["has_wiki"]
      hasDiscussions = pretty_data["has_discussions"]
      hasPages = pretty_data["has_pages"]
      
      # checking if license info available through REST API
      license_score = 0.0
      hasLicense = pretty_data["license"]
      if hasLicense == "False" or hasLicense == "None" or hasLicense == None:
        # if not through REST, then present in README (hopefully)
        # making third request for README.md
        RMurl = "https://api.github.com/repos/{}/{}/contents/README.md".format(owner, repo)
        RM_resp = requests.get(RMurl, headers=headers)
        RM_resp.raise_for_status()
        if RM_resp.status_code == 200:
          pretty_readme = json.loads(RM_resp.text)
          rmbase64 = pretty_readme["content"] # the text in README, base64 encoded

          #decode base64 and make into string
          decoded = base64.b64decode(rmbase64)
          decodeStr = decoded.decode()
          # all popular licenses and their compatibility score with LGPL 2.1 as defined 
          licenses = {"Apache": 0.0, "MIT": 1.0, "GPL": 1.0, "LGPL": 1.0, "MPL": 1.0, "Eclipse Public License": 0.0, "BSD": 1.0, "CDDL": 0.0}
          license_score = 0.5

          #license in README or not mentioned/available in repo
          # license compatible = 1, lincese exists but not compatible = 0.5, license doesn't exist = 0
          #if "Licence" in decodeStr or "License" in decodeStr:
          if 'Licence'.casefold() in decodeStr.casefold():
            licenseStr = decodeStr.split("Licence".casefold(),1)[0] 
            # check license in dictionary and update score
            for key, val in licenses.items():
                if key in licenseStr:
                  license_score = val
          elif 'License'.casefold in decodeStr.casefold():
            licenseStr = decodeStr.split("License".casefold(),1)[1] 
            for key, val in licenses.items():
                if key in licenseStr:
                  license_score = val
        else: #for third (README) request
          logging.debug("REST README.md Request failed with status code:", response.status_code)
      else: #license info available in REST API data
        # checking compatibility from REST data
        GitHub_LKey = hasLicense["key"] # GitHub license key from REST response
        #GitHub license keys for the popluar licenses and their compatibility score

        license_keys = {"apache": 0.0, "mit": 1.0, "gpl": 1.0, "lgpl": 1.0, "ms-pl": 1.0, "epl": 0.0, "bsd": 1.0, "cddl": 0.0}
        for key,val in license_keys.items():
          if key in GitHub_LKey:
            license_score = val

    else: # for second (content) request
      logging.debug("REST Content Request failed with status code:", response.status_code)
    
    # making fourth request for contributors and their commits/contributions
    contributeURL = "https://api.github.com/repos/{}/{}/contributors?per_page=10".format(owner, repo)
    contributors_resp = requests.get(contributeURL, headers=headers)
    contributors_resp.raise_for_status()
    if contributors_resp.status_code == 200:
      pretty_people = json.loads(contributors_resp.text)
      commits_sum = 0 # sum of all contributions/commits of person
      for i in range(len(pretty_people)):
        commits_sum += pretty_people[i]["contributions"]
    else: #for fourth (contributors) request
      logging.debug("REST Contributors Request failed with status code:", response.status_code)

  else: #for first (REST) request 
    logging.debug("REST Main Request failed with status code:", response.status_code)

  return test_score, license_score, hasWiki, hasDiscussions, hasPages, hasREADME, commits_sum

def getGqlData(owner, repo):
  token = os.getenv("GITHUB_TOKEN")   # get personal github api token

  headers = {"Authorization": "Token {}".format(token)}

  # Use the RequestsHTTPTransport class to send the GraphQL query with the headers
  transport = RequestsHTTPTransport(
    url="https://api.github.com/graphql",
    headers=headers,
    use_json=True,
  )

  # Create a client using the transport
  client = gql.Client(transport=transport, fetch_schema_from_transport=True)

### RESPONSE QUERY
  # create query
  response_query = """
  {{ 
  repository(owner:"{}", name:"{}") {{ 
    name
    issues {{
      totalCount
    }}
    open: issues(states:OPEN) {{
      totalCount
    }}
    closed: issues(states:CLOSED) {{
      totalCount
    }}
  }}
  }}
""".format(owner, repo)

  # Provide a GraphQL query
  query = gql.gql(response_query)

  # Execute the query on the transport
  response_result = client.execute(query) 

### BUS QUERY
  bus_query ="""
  {{
  repository(owner:"{}", name:"{}") {{
    object(expression:"master") {{
      ... on Commit {{
        history {{
          totalCount
        }}
      }}
    }}
  }}
}}
""".format(owner, repo)


  query = gql.gql(bus_query)
  bus_result = client.execute(query)

  bus_query_main_backup ="""
  {{
  repository(owner:"{}", name:"{}") {{
    object(expression:"main") {{
      ... on Commit {{
        history {{
          totalCount
        }}
      }}
    }}
  }}
}}
""".format(owner, repo)

  query = gql.gql(bus_query_main_backup)
  bus_result_backup = client.execute(query)

  total_commits = None
  if bus_result["repository"]["object"]:
    total_commits = bus_result["repository"]["object"]["history"]["totalCount"]
  elif bus_result_backup["repository"]["object"]:
    total_commits = bus_result_backup["repository"]["object"]["history"]["totalCount"]
  else:
    total_commits = None

  #format data
  data = {
    "open_issues": response_result["repository"]["open"]["totalCount"],
    "closed_issues": response_result["repository"]["closed"]["totalCount"],
    "total_commits":  total_commits
  }

  return data

# OK WORKS
def is_code_file(filename):
    """
    Check if the file is a code file based on its extension.
    """
    code_extensions = [".py", ".c", ".cpp", ".java", ".js", ".html", ".css", ".php", ".rb", ".ejs"]
    comment_extensions = [".md", ".txt"]
    _, extension = os.path.splitext(filename)
    return extension in code_extensions and extension not in comment_extensions

# WORKS and NEEDED
def count_lines_of_code_git(owner, repo, file_extensions=None):
    if file_extensions is None:
        file_extensions = ['.py', '.c', '.cpp', '.java', '.js', '.json', '.html', '.css', '.php', '.rb', '.ejs']

    # Clone the repository into a temporary directory
    with TemporaryDirectory() as temp_dir:
        repo_url = f'https://github.com/{owner}/{repo}.git'
        subprocess.run(['git', 'clone', repo_url, temp_dir], check=True)

        # Count the total number of lines of code in the master branch
        lines_of_code = 0
        for root, _, files in os.walk(temp_dir):
            for filename in files:
                if any(filename.endswith(ext) for ext in file_extensions):
                    file_path = os.path.join(root, filename)

                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                        content = file.read()

                        # Remove comments from the file content
                        content = remove_comments(content, filename)

                        lines_of_code += len(content.splitlines())

    return lines_of_code

# Remove comments from the file content WORKS and NEEDED
def remove_comments(content, filename):
  if filename.endswith('.py'):
      content = re.sub(r'#.*|""".*?"""|\'\'\'.*?\'\'\'', '', content, flags=re.DOTALL)
  elif filename.endswith(('.c', '.cpp', '.java')):
      content = re.sub(r'//.*|/\*.*?\*/', '', content, flags=re.DOTALL)
  elif filename.endswith(('.js', '.html', '.css', '.php')):
      content = re.sub(r'//.*|/\*(?:.|\n)*?\*/', '', content)
  elif filename.endswith('.rb'):
      content = re.sub(r'#.*|=begin(?:.|\n)*?=end', '', content, flags=re.DOTALL)
  elif filename.endswith('.ejs'):
      content = re.sub(r'<!--.*?-->|#.*', '', content, flags=re.DOTALL)
  return content

# Testing
def make_request_with_retries(url, headers, retries, backoff_factor):
    for i in range(retries):
      with requests.get(url, headers=headers) as resp:
        logging.info(f"make_request_with_retries: {resp.status_code}")
        time.sleep(1)
        try:
            resp.raise_for_status()
            return resp
        except requests.exceptions.HTTPError as err:
          if resp.status_code == 403 and "secondary rate limit" in err.response.text.lower():
            wait_time = backoff_factor * (2 ** i)
            logging.info(f"Hit secondary rate limit. Retrying in {wait_time} seconds.")
            time.sleep(wait_time)
          elif resp.status_code == 403 and "API rate limit exceeded for user ID" in err.response.text.lower():
              logging.info("API rate limit exceeded. Please try again later.")
              return -1
          else:
              logging.exception(f"Error while fetching data: {resp.status_code}")
              logging.exception(err.response.text)
    return None

# Testing
def get_pull_request_data1(pull_number, owner, repo, headers, retries=5, backoff_factor=1):
    pull_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}"
    pr_resp = make_request_with_retries(pull_url, headers, retries, backoff_factor)
    if not pr_resp:
        logging.info("Couldn't access pr metric data for pulls")
        return 0
    if pr_resp == -1:
        logging.info("API rate limit exceeded")
        return -1
    
    pr_data = pr_resp.json()
    reviews_url = pr_data["url"] + "/reviews"
    reviews_resp = make_request_with_retries(reviews_url, headers, retries, backoff_factor)
    if not reviews_resp:
        logging.info("Couldn't access pr metric data for reviews")
        return 0
    if reviews_resp == -1:
      return -1
    
    reviews_data = reviews_resp.json()
    approved_or_changes_requested = any(review["state"] in ["APPROVED"] for review in reviews_data) if reviews_data else False

    try:
      if approved_or_changes_requested or pr_data.get("review_comments") > 0 or pr_data.get("comments") > 0:
          logging.info("PR has been approved or has comments")
          return pr_data.get("additions", 0) - pr_data.get("deletions", 0)
      else:
          logging.info("PR has not been approved and has no comments")
          return 0
    except KeyError as e:
      logging.exception(f"KeyError: {e}")
      return 0
      
# WORKS and NEEDED
def fraction_reviewed_changes(owner, repo):
    """Computes the fraction of project code that was introduced through pull requests with a code review.
    Args:
        owner (str): The owner of the repository.
        repo (str): The name of the repository.
    Returns:
        float: The fraction of project code that was introduced through pull requests with a code review.
    """
    token = os.getenv("GITHUB_TOKEN")  # authentication
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    # Make a request for merged pull requests into the master branch
    pr_url = f"https://api.github.com/search/issues?q=is:pr is:merged is:closed repo:{owner}/{repo}+base:master&per_page=100&sort=created&order=desc"

    pr_resp = requests.get(pr_url, headers=headers)
    logging.info(f"fraction_reviewed_changes: {pr_resp.status_code}")

    if pr_resp.status_code != 200:
      logging.info(f"Error while fetching pull request data: {pr_resp.status_code}")
      logging.info(pr_resp.text)
      return 0

    # Retrieve all paginated results
    pr_data = []
    while pr_resp.status_code == 200 and len(pr_resp.json()["items"]) > 0:
        pr_data += pr_resp.json()["items"]
        next_url = None
        for link in pr_resp.headers.get("Link", "").split(","):
            if "rel=\"next\"" in link:
                next_url = link.split(";")[0].strip()[1:-1]
                logging.info(next_url)
        if next_url:
            pr_resp = requests.get(next_url, headers=headers)
            if pr_resp.status_code != 200:
              logging.info(f"Error while fetching pull request data: {pr_resp.status_code}")
              logging.info(pr_resp.text)
              return 0
        else:
            break

    total_lines_of_code = count_lines_of_code_git(owner, repo)
    #print(len(pr_data))

    reviewed_additions = 0
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(get_pull_request_data1, pr["number"], owner, repo, headers): pr for pr in pr_data}

        for future in as_completed(futures):
            result = future.result()
            if result:
                reviewed_additions += result

    fraction_reviewed = 0
    if abs(reviewed_additions) > 0:
        #print(reviewed_additions)
        #print(total_lines_of_code)
        fraction_reviewed = float(min(abs(reviewed_additions) / total_lines_of_code, 1))
    return fraction_reviewed




def getOwnerRepo(url):
  parts = re.split("/", url)
  len_parts = len(parts)
  if parts[len_parts-1] != "":
    owner = parts[len_parts-2]
    repo = parts[len_parts-1]
  elif parts[len_parts-1] == "":
    owner = parts[len_parts-3]
    repo = parts[len_parts-2]
  return owner, repo

def getData(owner_repo):
    owner,repo = getOwnerRepo(owner_repo)
    gqldata = getGqlData(owner, repo)
    test_score, license_score, hasWiki, hasDiscussions, hasPages, hasREADME, busTeamCommits = getRestData(owner, repo)

    data = gqldata
    data["has_readme"] = hasREADME
    data["has_wiki"] = hasWiki
    data["has_pages"] = hasPages
    data["has_discussions"] = hasDiscussions
    data["bus_commits"] = busTeamCommits
    data["correctness_score"] = test_score
    data["license_score"] = license_score
    data["code_review"] = fraction_reviewed_changes(owner, repo)
    if data["total_commits"] == None: data["total_commits"] = busTeamCommits
    
    return json.dumps(data)

def config_logging():
  # Set the logging level and format
  logging.basicConfig(filename='example.log', encoding='utf-8', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

  filepath = os.getenv("LOG_FILE") #authentication 
  log_level = os.getenv("LOG_LEVEL") #authentication
  if(log_level == 1):
    log_level = logging.INFO
  elif(log_level == 2):
    log_level = logging.DEBUG
  else:
    log_level = logging.CRITICAL
  try:
    logging.basicConfig(filename= "", level=log_level)
  except:
    logging.basicConfig(level=log_level)

config_logging()
