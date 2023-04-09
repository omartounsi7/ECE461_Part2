import express, { Request, Response, Router } from 'express';
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
    downloadRepo
} from "./datastore/modules";
import { addUser , findUserByName, userLogin } from "./datastore/users";
import {deleteEntity, doesIdExistInKind, resetKind} from "./datastore/datastore";
import {datastore, MODULE_KIND, NAMESPACE} from "./datastore/ds_config";
import { MODULE_STORAGE_BUCKET, storage } from "./cloud-storage/cs_config";
import { uploadModuleToCloudStorage, getModuleAsBase64FromCloudStorage, deleteModuleFromCloudStorage, resetCloudStorage, ZIP_FILETYPE, TXT_FILETYPE } from "./cloud-storage/cloud-storage";
import {base64ToFile, fileToBase64} from "./util";

const fs = require('fs');
const { execFile } = require('child_process');


/* * * * * * * * * * *
 * global variables  *
 * * * * * * * * * * */

const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";
const app = express();
const port = 8080;


app.use(express.json());


/* * * * * * * * * * * *
 * Rest API endpoints  *
 * * * * * * * * * * * */

// Fetch directory of packages
app.post('/packages', async (req, res) => {
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

    console.log(`Got /package post request`);

    // validate post request
    if (typeof queries === undefined || queries.length === 0) {
        // invalid request
    } else {
        // there are 1 more more queries. The request is valid.

        // check if an offset has been given. If not, default to 0
        let offset = req.query.offset;
        if (offset === undefined) {
            offset = "0";
        }
        // console.log(`offset: ${offset}`);
        // console.log(queries);

        // do db actions
    }


    // response

});

// Reset to default state
app.delete('/reset', async (req, res) => {
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
app.post('/package', async (req, res) => {
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
app.get('/package/:id', async (req, res) => {
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
    res.send(await downloadRepo(id));
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
app.put('/package/:id', async (req, res) => {
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
app.delete('/package/:id', async (req, res) => {
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
app.get('/package/:id/rate', async (req, res) => {
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
app.get('/package/byName/:name', async (req, res) => {
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
app.delete('/package/byName/:name', async (req, res) => {
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

// Get any packages fitting the regular expression
app.post('/package/byRegEx', async (req, res) => {
    // Check if the request has a JSON body
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Malformed JSON: Request must have a JSON body.' });
    }
    // Check if the 'regex' field is present in the request body
    const { regex }: { regex: string } = req.body;
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

    //console.log(response)

    // Return the search results
    if (response.length > 0) {
        // 200: Return a list of packages.
        return res.status(200).json(response);
    } else {
        // 404 Error: No package found under this regex.
        return res.status(404).json({ message: 'No packages found under this regex.' });
    }
});

app.put('/authenticate', async (req, res) => {
    // get AuthenticationRequest schema
    const username = req.body["User"]["name"];
    const isadmin = req.body["User"]["isAdmin"];
    const password = req.body["Secret"]["password"];
    // Sanitate this mf ^

    if(username === undefined || password === undefined) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    let authToken = await userLogin(username, password);
    if(authToken === "") {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json({ token: authToken });

    //return res.status(501).json({ message: 'This system does not support authentication' });
});

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

/* * * * * * * * * * * * * * *
 * Website Serving endpoints *
 * * * * * * * * * * * * * * */

app.get("/packages", async (req, res) => {
    // serve webpage
    console.log("hello world");
    res.sendFile(path.join(__dirname, HTML_PATH + "/packages.html"));
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, HTML_PATH + "/index.html"));
    res.send("index!");

});

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});
