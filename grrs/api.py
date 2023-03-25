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
from github import Github
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import tarfile
import gzip

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

def get_dependencies_using_gql(owner, repo):
    token = os.getenv("GITHUB_TOKEN")  # get personal github api token

    headers = {"Authorization": "Token {}".format(token),
               'Accept': 'application/vnd.github.hawkgirl-preview+json'}

    # Use the RequestsHTTPTransport class to send the GraphQL query with the headers
    transport = RequestsHTTPTransport(
        url="https://api.github.com/graphql",
        headers=headers,
        use_json=True,
    )

    # Create a client using the transport
    client = gql.Client(transport=transport, fetch_schema_from_transport=True)

    # create query
    response_query = """
    {{ 
    repository(owner:"{}", name:"{}"){{
          dependencyGraphManifests {{
          edges {{
            node {{
              dependencies {{
                nodes {{
                  repository {{
                    nameWithOwner
                    releases {{
                        totalCount
                    }}
                  }}
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """.format(owner, repo)

    # Provide a GraphQL query
    query = gql.gql(response_query)

    # Execute the query on the transport
    response_result = client.execute(query)
    return response_result

def calc_version_pinning_metric(owner, repo):
    # Get the dependencies of this repository
    rep_result = get_dependencies_using_gql(owner, repo)
    edges = rep_result['repository']['dependencyGraphManifests']['edges']
    repo_list = []
    for edge in edges:
        nodes = edge['node']['dependencies']['nodes']
        for node in nodes:
            if node['repository'] is None:
                continue
            repo_name = node['repository']['nameWithOwner']
            num_releases = node['repository']['releases']['totalCount']
            if repo_name not in repo_list:
                repo_list.append((repo_name, num_releases))

    # Calculate the dependencies that are pinned to at least a specific major + minor version
    num_dependencies = len(repo_list)
    num_dependencies_version = 0
    for repo in repo_list:
        if repo[1] >= 2:
            num_dependencies_version += 1

    version_pinning_metric = num_dependencies_version / num_dependencies
    return version_pinning_metric

# OK WORKS
def is_code_file(filename):
    """
    Check if the file is a code file based on its extension.
    """
    code_extensions = [".py", ".c", ".cpp", ".java", ".js", ".html", ".css", ".php", ".rb", ".ejs"]
    comment_extensions = [".md", ".txt"]
    _, extension = os.path.splitext(filename)
    return extension in code_extensions and extension not in comment_extensions

# OK WORKS BUT A LOT OF API CALLS WAISTED
def count_lines_of_code(owner, repo, path=''):
    # Authenticate with the GitHub API using an access token
    token = os.getenv("GITHUB_TOKEN")
    headers = {"Authorization": f"Bearer {token}", 'Accept': 'application/json'}

    # Get the root directory of the repository
    root_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    root_resp = requests.get(root_url, headers=headers)
    root_resp.raise_for_status()
    print(f"count_lines_of_code 1: {root_resp.status_code}")
    root_contents = json.loads(root_resp.text)

    # Recursively process all files in the repository
    lines_of_code = 0
    for item in root_contents:
      if item['type'] == 'file':
        if is_code_file(item['name']):
          # Get the contents of the file
          file_resp = requests.get(item["download_url"], headers=headers)
          file_resp.raise_for_status()
          print(f"count_lines_of_code 2: {file_resp.status_code}")
          content = file_resp.text
          lines_of_code += len(content.splitlines())
      elif item["type"] == "dir":
        # Recursively process subdirectories
        lines_of_code += count_lines_of_code(owner, repo, item['path'])

    return lines_of_code

# WORKS and NEEDED
def count_lines_of_code_git(owner, repo, file_extensions=None):
    if file_extensions is None:
        file_extensions = ['.py', '.c', '.cpp', '.java', '.js', '.html', '.css', '.php', '.rb', '.ejs']

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

# WORKS and NEEDED
def get_pull_request_data1(pull_number, owner, repo, headers, retries=5, backoff_factor=1):
  pull_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}"

  for i in range(retries):
      pr_resp = requests.get(pull_url, headers=headers)
      time.sleep(1)
      print(f"get_pull_request_data: {pr_resp.status_code}")

      if pr_resp.status_code == 200:
          pr_data = json.loads(pr_resp.text)
          reviews_url = pr_data["url"] + "/reviews"
          # Moved the reviews_resp status code check into a separate loop, which will ensure that the 
          # reviews API call is retried properly in case it fails. Now, the function will handle resubmissions 
          # for both pull request data and reviews data when an API call doesn't work. 
          for j in range(retries):
            reviews_resp = requests.get(reviews_url, headers=headers)
            print(reviews_resp.status_code)
            if reviews_resp.status_code == 200:
                reviews_data = json.loads(reviews_resp.text)
                # If reviews are available
                if len(reviews_data) > 0:
                  any_review_approved_or_changes_requested = any(review["state"] in ["APPROVED"] for review in reviews_data)
                  if (any_review_approved_or_changes_requested):
                      return (pr_data.get("additions") - pr_data.get("deletions"))
                  # Reviews are there but no one approved them
                  else:
                    print("Reviews are there but no one approved them ok")
                    return 0
                # If no reviews are available
                else:
                    try:
                      if (pr_data["review_comments"] > 0) or (pr_data["comments"] > 0):
                          return (pr_data.get("additions") - pr_data.get("deletions"))
                      print("No Reviews or comments are available")
                      return 0
                    except KeyError:
                      return 0

            else:
                pr_data = reviews_resp.json()
                if reviews_resp.status_code == 403 and "secondary rate limit" in pr_data.get("message", "").lower():
                    wait_time = backoff_factor * (2 ** j)
                    print(f"Hit secondary rate limit 1. Retrying in {wait_time} seconds.")
                    time.sleep(wait_time)
                else:
                    print(f"Error while fetching reviews: {reviews_resp.status_code}")
                    print(reviews_resp.text)
                    return 0
      else:
          pr_data = pr_resp.json()
          if pr_resp.status_code == 403 and "secondary rate limit" in pr_data.get("message", "").lower():
              wait_time = backoff_factor * (2 ** i)
              print(f"Hit secondary rate limit 2. Retrying in {wait_time} seconds.")
              time.sleep(wait_time)
          else:
              print(f"Error while fetching pull request data: {pr_resp.status_code}")
              print(pr_resp.text)
              return 0
  print("NOO")
  return 0

# Testing (PLAN B)
def fraction_reviewed_changes1(owner, repo):
    token = os.getenv("GITHUB_TOKEN")  # authentication
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    # Make a request for merged pull requests
    pr_url = f"https://api.github.com/search/issues?q=is:pr is:merged is:closed repo:{owner}/{repo}&per_page=100&sort=created&order=desc"
    pr_resp = requests.get(pr_url, headers=headers)
    print(f"fraction_reviewed_changes: {pr_resp.status_code}")
    pr_resp.raise_for_status()

    # Retrieve all paginated results
    pr_data = []
    while pr_resp.status_code == 200 and len(pr_resp.json()["items"]) > 0:
        pr_data += pr_resp.json()["items"]
        next_url = None
        for link in pr_resp.headers.get("Link", "").split(","):
            if "rel=\"next\"" in link:
                next_url = link.split(";")[0].strip()[1:-1]
                print(next_url)
        if next_url:
            pr_resp = requests.get(next_url, headers=headers)
        else:
            break

    # Count the number of merged pull requests that have at least one approving review
    reviewed_prs = 0
    for pr in pr_data:
        reviews_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr['number']}/reviews"
        reviews_resp = requests.get(reviews_url, headers=headers)
        reviews_resp.raise_for_status()
        reviews = reviews_resp.json()
        for review in reviews:
            if review["state"] == "APPROVED":
                reviewed_prs += 1
                break

    # Compute the fraction of merged pull requests that have at least one approving review
    # Ratio of the number of reviewed pull requests to the total number of merged pull requests in the pr_data list. 
    total_prs = len(pr_data)
    fraction_reviewed = 0
    if total_prs > 0:
        print(reviewed_prs)
        print(total_prs)
        fraction_reviewed = reviewed_prs / total_prs
    return fraction_reviewed

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
    print(f"fraction_reviewed_changes: {pr_resp.status_code}")

    if pr_resp.status_code != 200:
      print(f"Error while fetching pull request data: {pr_resp.status_code}")
      print(pr_resp.text)
      return 0

    # Retrieve all paginated results
    pr_data = []
    while pr_resp.status_code == 200 and len(pr_resp.json()["items"]) > 0:
        pr_data += pr_resp.json()["items"]
        next_url = None
        for link in pr_resp.headers.get("Link", "").split(","):
            if "rel=\"next\"" in link:
                next_url = link.split(";")[0].strip()[1:-1]
                print(next_url)
        if next_url:
            pr_resp = requests.get(next_url, headers=headers)
            if pr_resp.status_code != 200:
              print(f"Error while fetching pull request data: {pr_resp.status_code}")
              print(pr_resp.text)
              return 0
        else:
            break

    total_lines_of_code = count_lines_of_code_git(owner, repo)
    print(total_lines_of_code)
    print(len(pr_data))

    reviewed_additions = 0
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(get_pull_request_data1, pr["number"], owner, repo, headers): pr for pr in pr_data}

        for future in as_completed(futures):
            result = future.result()
            if result:
                reviewed_additions += result

    fraction_reviewed = 0
    if reviewed_additions > 0:
        fraction_reviewed = min(reviewed_additions / total_lines_of_code, 1)
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
    data["version_pinning"] = calc_version_pinning_metric(owner, repo)

    return json.dumps(data)

def config_logging():
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
