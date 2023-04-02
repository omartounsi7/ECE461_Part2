import express from 'express';
import path from 'path';

import { addRepo, updateRepo, deleteRepo, findRepo } from "./datastore/modules";
import { addUser } from "./datastore/users";


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
        console.log(`offset: ${offset}`);
        console.log(queries);

        // do db actions
    }


    // response

});

// Reset to default state
app.delete('/reset', async (req, res) => {
    res.send("reset endpoint");

    // get auth from header
    // look into https://jwt.io/
    //  let auth = req.header["X-Authorization"];

    // return 200 when registry is reset

    // return 400 for missing field/ invalid auth

    // return 401 for not enough permissions


})

// Upload endpoint and module ingestion
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
app.get('/package/:id', async (req, res) => {
    res.send("package/" + req.params.id + " endpoint");

    // download package by ID

    // default response:
    // unexpected error (what error code do we return)

    // code 200
    // return package schema json object
    //  includes: metadata and data

    // code 404
    // package DNE
});

// Update Endpoint
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

// Fetch package history
app.get('/package/byName/:name', (req, res) => {
    res.send("package/byName/" + req.params.name + " endpoint");

    // get auth token from header

    // default
    // respond with content as json formatted Error schema

    // 200
    // respond with PackageHistoryEntry in json schema

    // 400
    // maleformed json/ invalid auth

    // 404
    // package DNE
});

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
    await addRepo("eeeeeeeee", "eeeeeeeeee.com", "1.1");
    // await addRepo("yeet_test", "google.com", "4.3.2");
    // await addRepo("additional_repo","github", "1.2.2");
    // await addRepo("hacker_man", "lit_hub", "4.20.69");
    // await addRepo("fake_module", "mmm", "10.8.1");

    await findRepo("yeet1");
});

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});