import express, { Request, Response } from 'express';
import path from 'path';
import * as ffi from 'ffi-napi';

// npm install -g ts-node
// npm install --save ffi-napi @types/ffi-napi
import {
    addRepo,
    updateRepo,
    deleteRepo,
    findReposByName,
    getModuleKey,
    findReposByNameAndVersion,
    getAllReposPagenated,
    getAllRepos,
    updateRepoPackageAction,
    createRepoData,
    downloadRepo,
    getPopularityInfo
} from "./datastore/modules";
//import { addUser } from "./datastore/users";
import {deleteEntity, doesIdExistInKind, resetKind} from "./datastore/datastore";
import {datastore, MODULE_KIND, NAMESPACE} from "./datastore/ds_config";
import { MODULE_STORAGE_BUCKET, storage } from "./cloud-storage/cs_config";
import { uploadModuleToCloudStorage, getModuleAsBase64FromCloudStorage, deleteModuleFromCloudStorage, resetCloudStorage, ZIP_FILETYPE, TXT_FILETYPE } from "./cloud-storage/cloud-storage";
import {base64ToFile, fileToBase64} from "./util";
import { addUser , findUserByName, userLogin, accessSecret, updateApiCounter, deleteUser} from "./datastore/users"
const fs = require('fs');
const { execFile } = require('child_process');

// Imports the npm package
import dotenv from "dotenv"; 
import { json } from 'stream/consumers';
// Loads environment variables into process.env
dotenv.config(); 

/* * * * * * * * * * *
 * global variables  *
 * * * * * * * * * * */

const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";
const app = express();
const port = 8080;


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the "public" directory
app.use(express.static('assets/html'));

/* * * * * * * * * * * *
 * Rest API endpoints  *
 * * * * * * * * * * * */

// Fetch directory of packages
app.post('/packages', authenticateJWT, async (req, res) => {
    res.send("packages endpoint");

    // Overview:
    //  gets any package which fits the request
    //  to enumerate all packages: provide an array with a single PackageQuery whose name is "*"
    //  line # refers to the OpenAPI yml file

    // request body (json): line 18, 720
    //  [{name:str, version:str}]
    //  name: line 688
    //  version: line 712
    // query param
    //  offset: line 27, 732

    // responses
    //  default: line 35
    //      Error: line 513
    //          code (int32): line 515
    //          message (str): line 516
    //  200: line 41
    //      headers:
    //          offset (str): line 732
    //      content (json): line 49
    //          PackageMetadata: line 535
    //              name
    //              version
    //              ID
    //  400: line 65
    //      missing field/ mailformed request
    //  413: line 66
    //      too many packages returned

    // process request

    let queries = req.body.PackageQuery;
    let offset = req.query.offset;

    console.log(`Got /package post request`);

    // validate post request
    if (typeof queries === undefined || queries.length === 0 || offset === undefined) {
        // invalid request
    } else {
        // there are 1 more more queries and an offset is given. The request is valid.
         // do db actions

         // iterate thru the list of queries.
         // for each query, get its result
         // store all results into a list
         // return the list
    }


    // response

});

// Reset to default state
app.delete('/reset', authenticateJWT, async (req, res) => {
    console.log("reset endpoint");

    // get auth from header
    // look into https://jwt.io/
    //  let auth = req.header["X-Authorization"];
    if(!req.headers.authorization){
        res.sendStatus(400);
    }

    // return 200 when registry is reset
    await resetKind(MODULE_KIND);
    res.sendStatus(200);

    // return 400 for missing field/ invalid auth

    // return 401 for not enough permissions


})

// Upload endpoint and module ingestion
// (call logPackageAction) ACTION: CREATE 
app.post('/package', authenticateJWT, async (req, res) => {
    res.send("package endpoint");

    // get time
    const now = new Date(); // creates a new Date object representing the current date and time
    const currentTime = now.getTime(); // returns the number of milliseconds since January 1, 1970, 00:00:00 UTC


    // get req content
    const packageContents = req.body["data"]["Contents"];
    const packageURL = req.body["data"]["URL"];
    const packageName = req.body["metadata"]["Name"];
    const packageVersion = req.body["metadata"]["Version"];
    //const packageID = req.body["metadata"]["ID"];

    // get auth from header

    // Package Action
    // const userName = "Max";
    // const isAdmin = true;
    // Extract package metadata from metadata object in detabase
    // logPackageAction(userName, isAdmin, packageRepo.metaData, "CREATE");

    // Write the url to a file called URLs.txt
    fs.writeFileSync('URLs.txt', packageURL);

    // Define the type signature of the Rust function
    const handle_url_file = ffi.Library('./target/release/libmylib', {
        'handle_url_file': ['void', ['string', 'string', 'int']]
    }).handle_url_file;

    // Call the Rust function and output the result to the console
    handle_url_file("URLs.txt", "example.log", 1);

    // Read the contents of the metrics.txt file
    const metrics = fs.readFileSync('metrics.txt', 'utf-8');
    
    // Parse the JSON string into a JavaScript object
    const metricsObject = JSON.parse(metrics);
    
    // Extract the properties and convert the values to their numeric form
    const netScore = parseFloat(metricsObject.NET_SCORE);
    const rampUp = parseFloat(metricsObject.RAMP_UP_SCORE);
    const correctness = parseFloat(metricsObject.CORRECTNESS_SCORE);
    const busFactor = parseFloat(metricsObject.BUS_FACTOR_SCORE);
    const responsiveMaintainer = parseFloat(metricsObject.RESPONSIVE_MAINTAINER_SCORE);
    const license = parseFloat(metricsObject.LICENSE_SCORE);
    const codeReview = parseFloat(metricsObject.CODE_REVIEW);
    const version = parseFloat(metricsObject.Version_Pinning);

    // Check if the package meets the required scores
    if (netScore < 0.5 || rampUp < 0.5 || correctness < 0.5 || busFactor < 0.5 || responsiveMaintainer < 0.5 ||
        license < 0.5 || codeReview < 0.5 || version < 0.5) {
        res.status(500).send({error: 'The package rating system choked on at least one of the metrics'});
    } 
    let data = createRepoData(packageName, packageVersion, currentTime.toString(), packageURL, undefined)

    try {
        // attempt to create and save new package to database
        const newPackage = await addRepo(data);
        res.status(201).json(newPackage);
    } catch (error) {
        if (error instanceof InvalidRequestError) {
            res.status(400).send(error.message);
        } else if (error instanceof AuthenticationError) {
            res.status(403).send(error.message);
        } else if (error instanceof PackageAlreadyExistsError) {
            res.status(409).send(error.message);
        } else if (error instanceof PackageDisqualificationError) {
            res.status(424).send(error.message);
        } else {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    }
});

// Download Endpoint
// (call logPackageAction) ACTION: DOWNLOAD
app.get('/package/:id', authenticateJWT, async (req, res) => {
    console.log("package/" + req.params.id + " endpoint");

    let id = Number(req.params.id);
    const result = await doesIdExistInKind(MODULE_KIND, id)
    if(!result){
        res.send("req.params.id doesn't exist in MODULE_KIND.");
        return;
    }

    //Package Action
    //const userName = "Max";
    //const isAdmin = true;
    //logPackageAction(userName, isAdmin, packageRepo.metaData, "DOWNLOAD");

    // download package by ID
    let packageInfo = await downloadRepo(id);
    if("password" in packageInfo){
        delete packageInfo.password;
    }
    if("is_admin" in packageInfo){
        delete packageInfo.is_admin;
    }

    // Add the number of downloads and stars
    const popularityInfo = await getPopularityInfo(id);
    packageInfo['downloads'] = popularityInfo['downloads'];
    packageInfo['stars'] = popularityInfo['stars'];
    res.send(JSON.stringify(packageInfo));

    // default response:
    // unexpected error (what error code do we return)

    // code 200
    // return package schema json object
    //  includes: metadata and data

    // code 404
    // package DNE
});

// Update Endpoint
// (call logPackageAction), ACTION: UPDATE
app.put('/package/:id', authenticateJWT, async (req, res) => {
    res.send("package/" + req.params.id + " endpoint");

    // get time
    const now = new Date(); // creates a new Date object representing the current date and time
    const currentTime = now.getTime(); // returns the number of milliseconds since January 1, 1970, 00:00:00 UTC

    let id = Number(req.params.id);
    const result = await doesIdExistInKind(MODULE_KIND, id)
    if(!result){
        res.send("req.params.id doesn't exist in MODULE_KIND.");
        return;
    }

    // Package Action
    //const userName = "Max";
    //const isAdmin = true;
    //logPackageAction(userName, isAdmin, packageRepo.metaData, "UPDATE");

    // get req content
    const packageContents = req.body["data"]["Contents"];
    const packageURL = req.body["data"]["URL"];
    const packageName = req.body["metadata"]["Name"];
    const packageVersion = req.body["metadata"]["Version"];
    const packageID = req.body["metadata"]["ID"];

    // get auth from header
    let data = createRepoData(packageName, packageVersion, currentTime.toString(), packageURL, undefined)

    try {
        // attempt to create and save new package to database
        const newPackage = await updateRepo(packageID, data);
        res.status(200).json(newPackage);
    } catch (error) {
        if (error instanceof InvalidRequestError) {
            res.status(400).send(error.message);
        } else if (error instanceof PackageDoesNotExist) {
            res.status(404).send(error.message);
        } else {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    }

    // get package schema from request body

    // get id from path

    // 200
    // version is updated successfully
    // the package contents from PackageData schema will replace previous contents

    // 400
    // malformed json/ invalid auth

    // 404
    // package DNE

});

// Delete endpoint
app.delete('/package/:id', authenticateJWT, async (req, res) => {
    res.send("package/" + req.params.id + " endpoint");

    // get package ID from path

    // 200
    // package successfully deleted

    // 400
    // malformed json/invalid auth

    // 404
    // package DNE
});

// (call logPackageAction), ACTION: RATE
app.get('/package/:id/rate', authenticateJWT, async (req, res) => {
    // Extract package ID and authentication token from request params and headers
    const packageID = Number(req.params.id);

    const result = await doesIdExistInKind(MODULE_KIND, packageID)
    if(!result){
        // 404: Package does not exist.
        res.status(404).send({error: 'Package does not exist'});
        return;
    }
    // Download the package entity
    const packageRepo = await downloadRepo(packageID);
    //const userName = "Max";
    //const isAdmin = true;
    //logPackageAction(userName, isAdmin, packageRepo.metaData, "RATE");

    // Needed for Rate
    console.log(packageRepo.url);
    const url = packageRepo.url;

    // Write the url to a file called URLs.txt
    fs.writeFileSync('URLs.txt', url);

    // Define the type signature of the Rust function
    const handle_url_file = ffi.Library('./target/release/libmylib', {
      'handle_url_file': ['void', ['string', 'string', 'int']]
    }).handle_url_file;

    // Call the Rust function and output the result to the console
    handle_url_file("URLs.txt", "example.log", 1);
    
    console.log("Success, Rate works!!!")

    // Read the contents of the metrics.txt file
    const metrics = fs.readFileSync('metrics.txt', 'utf-8');

    try {
      // Parse the JSON string into a JavaScript object
      const metricsObject = JSON.parse(metrics);
      
      // Extract the properties and convert the values to their numeric form
      const url1 = metricsObject.URL;
      const netScore = parseFloat(metricsObject.NET_SCORE);
      const rampUp = parseFloat(metricsObject.RAMP_UP_SCORE);
      const correctness = parseFloat(metricsObject.CORRECTNESS_SCORE);
      const busFactor = parseFloat(metricsObject.BUS_FACTOR_SCORE);
      const responsiveMaintainer = parseFloat(metricsObject.RESPONSIVE_MAINTAINER_SCORE);
      const license = parseFloat(metricsObject.LICENSE_SCORE);
      const codeReview = parseFloat(metricsObject.CODE_REVIEW);
      const version = parseFloat(metricsObject.Version_Pinning);
    
      // Construct the response object
      const responseObject = {
        BusFactor: busFactor,
        Correctness: correctness,
        RampUp: rampUp,
        ResponsiveMaintainer: responsiveMaintainer,
        LicenseScore: license,
        GoodPinningPractice: version,
        PullRequest: codeReview,
        NetScore: netScore
      };
      
      // 200: Only send a 200 response if each metric was computed successfully
      if (busFactor !== undefined && correctness !== undefined && rampUp !== undefined && responsiveMaintainer !== undefined && license !== undefined && version !== undefined && codeReview !== undefined && netScore !== undefined) {
        // Send the response object to the client
        res.status(200).send(responseObject);
      } else {
        // 500: The package rating system choked on at least one of the metrics.
        res.status(500).send({error: 'The package rating system choked on at least one of the metrics'});
      }
    } catch (error) {
      // If there was an error parsing the JSON string
      res.status(400).send({ error: 'Malformed json' });
    }
});

// Checks if the package name adheres to the naming conventions
function nameConv(name: string): boolean {
  for (let i = 0; i < name.length; i++) {
    const charCode = name.charCodeAt(i);
    // every character one can type on the keyboard
    // ASCII codes 32 (space) to 126 (~).
    if (charCode < 32 || charCode > 126) {
      return false;
    }
  }
  return true;
}
// Return the history of this package (all versions).
app.get('/package/byName/:name', authenticateJWT, async (req, res) => {
    try {
      // get package name from header
      const packageName = req.params.name;

      // PackageName Schema
      // - Names should only use typical "keyboard" characters.
      // - The name "*" is reserved. See the `/packages` API for its meaning.
      
      // Check if the package name adheres to the naming conventions
      if (!nameConv(packageName) || packageName === '*') {
        // 400 - invalid package name
        res.status(400).json({error: 'Invalid package name'});
      } else {
        // Retrieve all packages from the datastore with that package name
        const allPackages = await findReposByName(packageName);
    
        if (allPackages.length === 0) {
            // 404 - package does not exist
            res.status(404).json({error: 'Package does not exist'});
        } else {
            // Combine the packageAction fields of all packages into a single array
            const combinedActions = allPackages.reduce((acc: string | any[], pkg: { packageAction: any; }) => {
                return acc.concat(pkg.packageAction);
            }, []);

            // 200 - list of combined packageAction fields
            res.status(200).json(combinedActions);
        }
      }
    } catch (error) {
      // 400 - malformed JSON or invalid authentiation
      res.status(400).json({error: 'Bad request'});
    }
});

// Deletes all versions of a package from the datastore with the given name.
app.delete('/package/byName/:name', authenticateJWT, async (req, res) => {
    // get package name from header
    const packageName = req.params.name;
    
    // Check if the package name adheres to the naming conventions
    if (!nameConv(packageName) || packageName === '*') {
        // 400 - invalid package name
        res.status(400).json({error: 'Invalid package name'});
    } else {
        // Retrieve all packages from the datastore with that package name
        const allPackages = await findReposByName(packageName);

        if (allPackages.length === 0) {
            // 404 - package does not exist
            res.status(404).json({error: 'Package does not exist'});
        } else {

            let id = null;
            const deletionPromises = [];

            // Iterates over each package
            for (const pkg of allPackages) {
            const symbolKeys = Object.getOwnPropertySymbols(pkg);
            // Iterates over each key in dictionary
            for (const symbolKey of symbolKeys) {
                if (symbolKey.toString() === 'Symbol(KEY)') {
                // Extracts the ID
                id = pkg[symbolKey].id;
                console.log(id)
                break;
                }
            }
            deletionPromises.push(deleteRepo(Number(id)));
            }
            // Delete all versions of the package from the datastore
            await Promise.all(deletionPromises);
            // 200 - package successfully deleted
            res.status(200).json({ message: `All versions of package ${packageName} have been deleted` });
        }
    }
});

// We use the authenticateJWT middleware function to protect routes that require 
// authentication, like the /package/byRegEx endpoint
// Get any packages fitting the regular expression
app.post('/package/byRegEx',authenticateJWT, async (req, res) => {

    // Check if the request has a JSON body
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Malformed JSON: Request must have a JSON body.' });
    }
    // Check if the 'regex' field is present in the request body
    const regex = req.body["RegEx"];
    if (!regex) { 
        return res.status(400).json({ message: 'Malformed JSON: Request must include a regex field.' });
    }
    
    // Retrieve all packages from the datastore
    const allPackages = await getAllRepos();

    // Search for packages using regular expression over package names and READMEs.
    const results = allPackages.filter((pkg: { name: string; readme: string; }) => {
        return new RegExp(regex).test(pkg.name) || new RegExp(regex).test(pkg.readme);
    });

    //console.log(results)

    // Extract the name and version of each matching package
    const response = results.map((pkg: { name: any; version: any; }) => {
        return {
            Name: pkg.name,
            Version: pkg.version
        };
    });

    // Return the search results
    if (response.length > 0) {
        // 200: Return a list of packages.
        return res.status(200).json(response);
    } else {
        // 404 Error: No package found under this regex.
        return res.status(404).json({ message: 'No packages found under this regex.' });
    };

});

// Fetch uploader name and upload date
app.get('/package/:id/upload_info',authenticateJWT, async (req, res) => {
  // Extract package ID and authentication token from request params and headers
  const packageID = Number(req.params.id);

  const result = await doesIdExistInKind(MODULE_KIND, packageID)
  if(!result){
      // 404: Package does not exist.
      res.status(404).send({error: 'Package does not exist'});
      return;
  }
  // Get the package information by id
  const packageRepo = await downloadRepo(packageID);
  res.send({"name": packageRepo.name, "date": packageRepo["creation-date"]});
});

//1. Install the jsonwebtoken library: npm install jsonwebtoken
const jwt = require("jsonwebtoken");

// 2. Create a middleware function that checks for the JWT token in the Authorization header 
// of incoming requests and verifies its authenticity using the jsonwebtoken library:
async function authenticateJWT(req: any, res: any, next: any) {
  // Retrieve the value of the 'X-Authorization' header from the request headers
  const authHeader = req.headers['x-authorization'];
  // console.log(req.headers['x-authorization'])
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    // Retrieve the JWT secret key 
    let jwtSecret = "apple";//await accessSecret();
    if (!jwtSecret) {
        return res.status(401).json({message: 'Access Failed: Server Error retrieving secret key' });}
    try {
        const decodedToken = jwt.verify(token, jwtSecret);
        console.log(decodedToken)

        // Decrement API counter in database by one every time an API endpoint is called
        const apiCounterError = await updateApiCounter(decodedToken.id);
        if (apiCounterError) {
            throw new Error('API counter went below 0');
        }
        // Admin boolean of current user will be passed to the next middleware function 
        req.admin = decodedToken.admin; 
        next();
    } catch (err: any) {
        // If the token is expired or used more than 1000 times
        if (err instanceof jwt.TokenExpiredError || (typeof err.message === 'string' && err.message === 'API counter went below 0')) {
            // Generate a new token by asking the user to log back in!
            return res.status(402).json({message: 'Access Failed: Token expired for current user. Please log in again' });
        }
        // If the token seems to have an invalid signature (JsonWebTokenError) *someone tempered with it* or other errors
        return res.status(401).json({message: 'Access Failed: Invalid token or Misformed token' });
    }
  } else {
    return res.status(401).json({ message: 'Access Failed: Token not provided' });
  }
};

// Checks if user has admin priviledges
async function isAdmin(req: any, res: any, next: any) {
    console.log(req.admin)
    if (req.admin === true) {
      next();
    } else {
        return res.status(403).json({ message: "Insufficient permissions." });
    }
}

app.get('/isAdmin', authenticateJWT, isAdmin, async (req, res) => {
    return res.status(200).json({ message: "User is an admin." });
});


// When the user first logs-in
async function authentication(req: any, res: any) {
    const { User, Secret } = req.body;

    // Check that the User and Secret objects are present in the request body
    if (!User || !Secret) {
        return res.status(400).json({ message: 'Request body must contain User and Secret objects.' });
    }
    
    // Check that the User object contains the required properties
    if (!User["name"] || typeof User["name"] !== 'string' || typeof User["isAdmin"] !== 'boolean') {
        return res.status(400).json({ message: 'Username field is empty.' });
    }
    
    // Check that the Secret object contains the required properties
    if (!Secret["password"] || typeof Secret["password"] !== 'string') {
        return res.status(400).json({ message: 'Password field is empty' });
    }
    
    const username = req.body["User"]["name"];
    const isadmin = req.body["User"]["isAdmin"];
    const password = req.body["Secret"]["password"];

    const sanitzed_password = sanitizeInput(password)
    let authToken =  await userLogin(username, sanitzed_password);
    if (authToken === "") {
        return res.status(401).json({message: 'Username or Password is invalid!'});
    } else {
        return res.status(200).json({message: 'bearer ' + authToken});
    }
}
app.put('/authenticate', authentication)



/*
    The following characters are being escaped:

    Single quote (')
    Double quote (")
    Semicolon (;)
    Right single quotation mark (’)
    Right double quotation mark (”)
    Exclamation mark (!)
    Underscore (_)
    Plus sign (+)
    At symbol (@)
    Asterisk (*)
    Ampersand (&)
    Hash symbol (#)
    Backslash (\)
    Hyphen (-)
*/
function sanitizeInput(input: string) {
    // Define a regular expression to escape any potentially dangerous characters
    const injectionRegex = /['";’”!_+@*&#\\-]/g;
    // Replace any matches with the matched character preceded by a backslash
    var escapedInput = input.replace(injectionRegex, '\\$&');
    return escapedInput;
}
      
/**
 * Logs a package action in the repository for the given user and package.
 *
 * @param {string} userName - The name of the user performing the action.
 * @param {boolean} isAdmin - Indicates if the user is an administrator.
 * 
 * @param {string} packageName - The name of the package being acted upon.
 * @param {string} packageVersion - The version of the package being acted upon.
 * The "packageName" and "packageVersion" are used as a unique identifier pair when uploading a package.
 * 
 * @param {string} packageID - The unique identifier of the package being acted upon.
 *   This is used as an internal identifier for interacting with existing packages.
 *   packageID is used with the /package/{id} endpoint.
 * 
 * @param {string} action - The action being performed on the package [ CREATE, UPDATE, DOWNLOAD, RATE ].
 */

// Follows the structure of the PackageHistoryEntry Schema
async function logPackageAction(userName: string, isAdmin: boolean, packageRepo: any, action: string) {
    const now = new Date();
    const packageAction = {
      User: {
        name: userName,
        isAdmin: isAdmin
      },
      Date: now,
      PackageMetadata: {
        Name: packageRepo.Name,
        Version: packageRepo.Version,
        ID: packageRepo.ID
      },
      Action: action
    };

    // Updates the packageAction field of a package in the datastore for the given repository ID.
    await updateRepoPackageAction(packageRepo.ID, packageAction);
}


app.get('/user/:name', authenticateJWT, async (req, res) => {
    // name of user we want to query
    const name = req.params.name;
    const results = await findUserByName(name);
    // return a boolean value based on the length of the results
    return res.send(results.length > 0);
});

app.post('/new_user', authenticateJWT, async (req, res) => {
    // name of user we want to register
    const username = req.body["username"];
    const password = req.body["password"];
    const is_admin = req.body["admin"];
    const key = await addUser(username, password, is_admin);
    return res.status(201).json({ message: "User added successfully." });
});

// Reset to default state
app.delete('/user', async (req, res) => {
    // Define the JWT secret (this should be stored securely and not hard-coded)
    let jwtSecret = "apple"

    // Retrieve the value of the 'X-Authorization' header from the request headers
    const authHeader = req.headers['x-authorization'];
    if (authHeader) {
        const authToken = (authHeader as string).split(' ')[1];
        
        // Decode the JWT token and extract the payload
        const decodedToken = jwt.verify(authToken, jwtSecret);
        // Find the user_id by decoding the JWT_TOKEN
        const userId = decodedToken.id;
        await deleteUser(userId);
        return res.status(200).json({message: "User deleted successfully"});
    }
});

/* * * * * * * * * * * * * * *
 * Website Serving endpoints *
 * * * * * * * * * * * * * * */

app.get("/packages", authenticateJWT, async (req, res) => {
    console.log("Redirecting user to packages.html")
    // server webpage (If successfully logged in, redirect to packages.html)
    res.status(200).sendFile(path.join(__dirname, HTML_PATH + "/packages.html"));
});

app.put('/', async (req, res) => {
    await addUser('max', '12345', true);
    //res.sendFile(path.join(__dirname, HTML_PATH + "/index.html"));
});


app.get('/', async (req, res) => {
    //res.sendFile(path.join(__dirname, HTML_PATH + "/index.html"));
});

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});