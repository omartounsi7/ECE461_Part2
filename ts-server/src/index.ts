import express from 'express';
import path from 'path';

import {
    addRepo,
    updateRepo,
    deleteRepo,
    findReposByName,
    findReposByNameAndVersion,
    getAllReposPagenated,
    createRepoData,
    downloadRepo
} from "./datastore/modules";
import { addUser } from "./datastore/users";
import {deleteEntity, doesIdExistInKind, resetKind} from "./datastore/datastore";
import {MODULE_KIND} from "./datastore/ds_config";


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

    // get req content as PackageData schema
    const packageData = req.body;

    // get auth from header
    const auth = req.headers.authorization;

    try {
        // attempt to create and save new package to database
        const newPackage = await addRepo(packageData.name, packageData.version, packageData.url);
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
    // 201
    // respond with Package schema json object

    // 400
    // malformed json/ invalid auth

    // 403
    // auth failed (no permissions)

    // 409
    // package already exists

    // 424
    // package not uploaded due to disqualification
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

// Rate endpoint
// (call logPackageAction), ACTION: RATE
app.get('/package/:id/rate', (req, res) => {
    res.send("package/" + req.params.id + "/rate endpoint");

    // get req with PackageID and AuthenticationToken schema
    // respond with content as PackageRating schema

    // 400
    // malformed json/ invalid auth

    // 404
    // package DNE

    // 500
    // package choked on one metric
});

// Return the history of this package (all versions).
app.get('/package/byName/:name', async (req, res) => {
    try {
      // get package name from header
      const packageName = req.params.name;

      // PackageName Schema
      // - Names should only use typical "keyboard" characters.
      // - The name "*" is reserved. See the `/packages` API for its meaning.
      
      // Check if the package name adheres to the naming conventions
      const filter = /^[a-zA-Z0-9\-._~!$&'()*+,;=]+$/.test(packageName);
      if (!filter || packageName === '*') {
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
async function logPackageAction(userName: string, isAdmin: boolean, packageName: string, packageVersion: string, packageID: string, action: string) {
    const now = new Date();
    const packageAction = {
      User: {
        name: userName,
        isAdmin: isAdmin
      },
      Date: now,
      PackageMetadata: {
        Name: packageName,
        Version: packageVersion,
        ID: packageID
      },
      Action: action
    };
    // Updates the packageAction field of a package in the datastore for the given repository ID.
    await updateRepoPackageAction(packageID, packageAction);
}


// Delete endpoint
app.delete('/package/byName/:name', async (req, res) => {

    // get package name from header
    // get auth token from header

    // 200
    // package successfully deleted

    // 400
    // malformed json/ invalid auth

    // 404
    // package DNE
});

// Fetch package with Regex
app.post('/package/byRegEx/:regex', (req, res) => {
    res.send("package/byRegEx/" + req.params.regex + " endpoint");



    // search package names and readme

    // not sure which one is right since the OpenAPI specs say both
    // get regex from url
    // get regex from content as json
    // get auth

    // 200
    // packages found
    // respond with array of PackageMetadata schemas

    // 400
    // malformed json / invalid auth

    // 404
    // no package found that matches this regex
});

// Username-password authentication
app.put('/authenticate', (req, res) => {
    res.send("authenticate endpoint");

    // get AuthenticationRequest schema

    // 200
    // returned auth token successfully

    // 400
    // malformed json / invalid auth

    // 401
    // username or password invalid

    // 501
    // this system does not support authentication

});


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
