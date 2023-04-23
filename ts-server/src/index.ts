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
    updateMetaData,
    updateRepoPackageAction,
    createRepoData,
    findModuleById,
    downloadRepo,
    getPopularityInfo
} from "./datastore/modules";
//import { addUser } from "./datastore/users";
import {deleteEntity, doesIdExistInKind, resetKind} from "./datastore/datastore";
import {datastore, MODULE_KIND, USER_KIND, NAMESPACE} from "./datastore/ds_config";
import { MODULE_STORAGE_BUCKET, storage } from "./cloud-storage/cs_config";
import { uploadModuleToCloudStorage, getModuleAsBase64FromCloudStorage, cloudStorageFilePathBuilder, deleteModuleFromCloudStorage, resetCloudStorage, ZIP_FILETYPE, TXT_FILETYPE } from "./cloud-storage/cloud-storage";
import {base64ToFile, fileToBase64} from "./util";
import { addUser , findUserByName, userLogin, accessSecret, updateApiCounter, deleteUser} from "./datastore/users"
const fs = require('fs');
const JSZip = require('jszip');
const zlib = require('zlib');
const { promisify } = require('util');
const zipdir = require('zip-dir');
const { execSync } = require('child_process');



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

const bodyParser = require('body-parser');
// Increase the payload size limit to 1 gigabyte
app.use(bodyParser.json({ limit: '100gb' }));

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

// Reset the registry to a system default state (an empty registry with the default user))
app.delete('/reset', authenticateJWT, isAdmin, async (req, res) => {
    console.log("Reset endpoint");

    // deletes all modules stored in firestore
    await resetKind(MODULE_KIND);
    // deletes all users stored in firestore (add the default user in return function)
    await resetKind(USER_KIND);

    // deletes all packages stored in Google Cloud storage
    await resetCloudStorage(MODULE_STORAGE_BUCKET);

    // Code: 200  Registry is reset
    res.sendStatus(200);
})


type StatusMessage = {
  statusCode: number;
  message: string;
};

// Upload endpoint and module ingestion
// (call logPackageAction) ACTION: CREATE 
app.post('/package', async (req, res) => {

    /*
    Content: string *The uploaded content is a zipped version of the package*
    Package contents: zip file uploaded by the user. (Encoded as text using a Base64 encoding)

    This will be a zipped version of an npm package's GitHub repository, minus the ".git/" directory." 
    It will, for example, include the "package.json" file that can be used to retrieve the project homepage.
    See https://docs.npmjs.com/cli/v7/configuring-npm/package-json#homepage.
    */
    const base64String = req.body["Content"];

    /*
    URL: string
    Package URL (for use in public ingest).
    */
    const url = req.body["URL"];

    /*JSProgram	string
    A JavaScript program (for use with sensitive modules).
    */
    const JSProgram = req.body["JSProgram"];

    // On package upload, either Content or URL should be set. If both are set, returns 400.
    if (base64String && url) {
        return res.status(400).send({message: "Both 'Content' and 'URL' cannot be provided at the same time."});
    } else if (!base64String && !url) {
        return res.status(400).send({message: "Either 'Content' or 'URL' must be provided."});
    }

    // Base64 encoded string is passed in req.body
    if (base64String) {
        await decodeBase64(base64String, JSProgram, res, req);
    } 

    // Package URL (for use in public ingest) is passed in req.body
    if (url) {
        /* 
        1. DO RATING of Package URL (for use in public ingest).
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
            res.status(424).send({message: 'Package is not uploaded due to the disqualified rating'});
        } 
        */
        
        const parts = url.split('/');
        const cloneDir = './' + parts[parts.length - 1];
        const zipdirAsync = promisify(zipdir);
        
        let base64String;

        try {
            // Clone the GitHub package locally
            execSync(`git clone ${url} ${cloneDir}`);
            console.log("0") 

            // Remove the .git directory
            const gitDir = `${cloneDir}/.git`;
            if (fs.existsSync(gitDir)) {
                fs.rmSync(gitDir, { recursive: true, force: true });
            }
            // Create a zipped file
            const buffer: Buffer = await zipdirAsync(cloneDir, { saveTo: cloneDir + '.zip' });

            // Encode the zipped file to a Base64-encoded string
            base64String = Buffer.from(buffer).toString('base64');
            
            const result = await decodeBase64(base64String, JSProgram, res, req);
            console.log(result)
            console.log('Error in decodeBase64:', result.message);

            if (result.message.includes("homepage URL is missing in package.json")){
                // Remove the locally downloaded GitHub directory
                fs.rmdirSync(cloneDir, { recursive: true });
                return res.status(400).send(result.message);
            }
            
            if (result.message.includes("Package exists already")){
                // Remove the locally downloaded GitHub directory
                fs.rmdirSync(cloneDir, { recursive: true });
                return res.status(409).send('Bad Request: Package exists already');
            }
            
            if (result.message.includes("package.json file is missing")){
                // Remove the locally downloaded GitHub directory
                fs.rmdirSync(cloneDir, { recursive: true });
                return res.status(400).send('Bad Request: package.json file is missing');      
            }
            
            if (result.message.includes("Failed to add repository:")){
                // Remove the locally downloaded GitHub directory
                fs.rmdirSync(cloneDir, { recursive: true });
                return res.status(400).send(result.message);
            }

            if (result.message.includes("An error occurred while updating metadata:")){
                // Remove the locally downloaded GitHub directory
                fs.rmdirSync(cloneDir, { recursive: true });
                return res.status(400).send(result.message);
            }
            // Remove the locally downloaded GitHub directory
            fs.rmdirSync(cloneDir, { recursive: true });
            console.log("Success!");

        } catch (error: any) {}
    }
});

async function decodeBase64(base64String: string, JSProgram: string, res: any, req: any) {

    // Decode the Base64 string
    const binaryData = Buffer.from(base64String, 'base64').toString('binary');
    
    // Convert the binary data to a Uint8Array
    const byteArray = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
    }
    
    // Load the zip file using JSZip
    const zip = await JSZip.loadAsync(byteArray);

    // Will store the package name from package.json
    let packageName;

    // Will store the package version from package.json
    let packageVersion;

    // Will store the README contents of the uploaded package
    let readmeContent;

    // Will store `homepage` URL (links to the GitHub repository) from package.json
    let packageURL;


    try {
        // Extract the package.json file
        const packageJsonContent = await zip.file('package.json').async('string');
        
        // Parse the package.json content as a JSON object
        const packageJson = JSON.parse(packageJsonContent);
        
        // Extract the name and version fields from package.json
        packageName = packageJson.name;
        packageVersion = packageJson.version;

        // Extract`homepage` URL (links to the GitHub repository) from package.json
        packageURL = "https://github.com/jashkenas/underscore"; //packageJson.homepage;

        if (!packageURL) {
            return { statusCode: 400, message: 'Bad Request: homepage URL is missing in package.json' };
        }

        const readmeFile = await zip.file("README.md");
        if (readmeFile) {
            // readmeContent will be passed to the createRepo function
            readmeContent = await readmeFile.async('string');
            // Using zlib to compress the readmeContent
            readmeContent = zlib.deflateSync(readmeContent);
        }

        // Checks if package already exists in database
        const result = await findReposByNameAndVersion(packageName, packageVersion);
        if (result.length > 0) {
            // package exists already (409 error code)
            return { statusCode: 409, message: 'Conflict: Package exists already' };
        }

    } catch (error: any) { // specify the type of the error variable
        if (error.message === "Cannot read properties of null (reading 'async')") {
            // The package.json file does not exist in the zip file
            // Return an appropriate HTTP error code like 400 Bad Request
            return { statusCode: 400, message: 'Bad Request: package.json file is missing' };
        }
    }

    const cloudStoragePath = cloudStorageFilePathBuilder(packageName + ".zip", packageVersion);

    let newPackageID;
    let metadata;
    try {
        let data = createRepoData(packageName, packageVersion, new Date().toJSON(), packageURL, undefined, readmeContent, undefined, cloudStoragePath)
        // attempt to create and save new package to database
        newPackageID = await addRepo(data);
    } catch (error: any) {
        console.log(`Failed to add repository: ${error.message}`);
        return { statusCode: 400, message: `Failed to add repository: ${error.message}` };
    }

    // Create a JavaScript object with the metadata
    metadata = {
        "Name": packageName,
        "Version": packageVersion,
        "ID": newPackageID
    };

    if (newPackageID && newPackageID.length > 0) {
        try {
            await updateMetaData(newPackageID, metadata);
        } catch (error: any) {
            console.log(`An error occurred while updating metadata: ${error.message}`);
            return { statusCode: 400, message: `An error occurred while updating metadata: ${error.message}` };
        }
    }

    // Define the JWT secret (this should be stored securely and not hard-coded)
    let jwtSecret = "apple"

    // Retrieve the value of the 'X-Authorization' header from the request headers
    const authHeader = req.headers['x-authorization'];
    const authToken = (authHeader as string).split(' ')[1];
    
    // Decode the JWT token and extract the payload
    const decodedToken = jwt.verify(authToken, jwtSecret);
    // Find the user name by decoding the JWT_TOKEN
    const userName = decodedToken.name;
    // Find whether the user is an admin by decoding the JWT_TOKEN
    const isAdmin = decodedToken.admin;
    // Package Action: CREATE
    logPackageAction(userName, isAdmin, metadata, "CREATE");

    // Define response JSON object
    const responseObject = {
        "metadata": {
            "Name": packageName,
            "Version": packageVersion,
            "ID": newPackageID
        },
        "data": {
            "Content": base64String,
            "JSProgram": JSProgram
        }
    }

    // Uploads module to Google Cloud Storage
    uploadModuleToCloudStorage(packageName, packageVersion, ZIP_FILETYPE, base64String, MODULE_STORAGE_BUCKET);

    // 201 Success. Check the ID in the returned metadata for the official ID.
    res.status(201).json(responseObject);
    return { statusCode: 201, message: "Success" };
}

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
app.put('/package/:id', authenticateJWT, async (req, res) => {

    // On package update, exactly one field should be set.
    // The package contents (from PackageData) will replace the previous contents.
    const packageContents = req.body["data"]["Content"];
    const packageURL = req.body["data"]["URL"];
    const JSProgram = req.body["data"]["JSProgram"];

    // On package upload, either Content or URL should be set. If both are set, returns 400.
    if (packageContents && packageURL) {
        return res.status(400).send({message: "Both 'Content' and 'URL' cannot be provided at the same time."});
    } else if (!packageContents && !packageURL) {
        return res.status(400).send({message: "Either 'Content' or 'URL' must be provided."});
    }

   
    let id = Number(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "There is a missing field in the PackageID" });
    }

    const result = await doesIdExistInKind(MODULE_KIND, id)
    if(!result){
        return res.status(404).json({ message: "Package does not exist" });
    }

    // The name, version, and ID must match.
    const entry = await findModuleById(id);

    const packageName = req.body["metadata"]["Name"];
    const packageVersion = req.body["metadata"]["Version"];
    const packageID = req.body["metadata"]["ID"];

    // The name, version, and ID must match.
    if ((entry.Name === packageName) && (entry.Version == packageVersion) && (entry.ID === packageID)) {

        // if packageContents field is set
        if (packageContents) {
            // 200: Version is updated.
            // Package contents from PackageData schema will replace previous contents

        }

        // if packageURL field is set
        if (packageURL) {

        }

        // Package Action
        // const userName = "Max";
        // const isAdmin = true;
        //logPackageAction(userName, isAdmin, packageRepo.metaData, "UPDATE");

        // 200 Version is updated.
        // the package contents from PackageData schema will replace previous contents
    }
});

// Delete endpoint
app.delete('/package/:id', authenticateJWT, async (req, res) => {
    console.log(req.params.id)

    const id = req.params.id;
    // Check for missing id field in request
    if (!id) {
        return res.status(400).json({message: 'Package ID is required'});
    }

    const record = await findModuleById(Number(id));
    console.log(record)
    if (record) {
        await deleteRepo(Number(id));
        await deleteModuleFromCloudStorage(record.cloudStoragePath, MODULE_STORAGE_BUCKET);
        return res.status(200).json({ message: "Package is deleted" });
    } else {
        return res.status(404).json({ message: "Package does not exist" });
    }
});

// (call logPackageAction), ACTION: RATE
app.get('/package/:id/rate', authenticateJWT, async (req, res) => {
    // Extract package ID and authentication token from request params and headers
    const packageID = Number(req.params.id);

    const result = await doesIdExistInKind(MODULE_KIND, packageID)
    if(!result){
        // 404: Package does not exist.
        res.status(404).send({message: 'Package does not exist'});
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
app.delete('/package/byName/:name', async (req, res) => {
    // get package name from header
    console.log(req.params.name);
    const packageName = req.params.name;

    if (!packageName){
        return res.status(400).json({message: 'Package Name is required'});
    }
    
    // Check if the package name adheres to the naming conventions
    if (!nameConv(packageName) || packageName === '*') {
        // 400 - invalid package name
        res.status(400).json({message: 'Invalid package name'});
    } else {
        // Retrieve all packages from the datastore with that package name
        const allPackages = await findReposByName(packageName);

        if (allPackages.length === 0) {
            // 404 - package does not exist
            res.status(404).json({message: 'Package does not exist'});
        } else {
            // Iterates over each package
            for (const pkg of allPackages) {
                const cloudStoragePath = pkg.cloudStoragePath;
                let id = pkg.metaData["ID"];
                // Delete all versions of the package from the datastore + Google Cloud Storage
                await deleteModuleFromCloudStorage(cloudStoragePath, MODULE_STORAGE_BUCKET);
                await deleteRepo(Number(id));
            }
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

    try {
        const results = allPackages.filter((pkg: { name: string; readme: string; }) => {
            // Decompress the readme content
            const readmeContent = zlib.inflateSync(pkg.readme).toString(); 
            return new RegExp(regex).test(pkg.name) || new RegExp(regex).test(readmeContent);
        });

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
    } catch (error) {
        if (error instanceof SyntaxError) {
            // Handle the SyntaxError here
            return res.status(400).json({ message: 'SyntaxError: Invalid regular expression' });
        }
    }
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

// Create a middleware function that checks for the JWT token in the Authorization header 
// of incoming requests and verifies its authenticity using the jsonwebtoken library:

// ERROR 400: There is missing field(s) in the AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.
async function authenticateJWT(req: any, res: any, next: any) {
  // Retrieve the value of the 'X-Authorization' header from the request headers
  const authHeader = req.headers['x-authorization'];
  // console.log(req.headers['x-authorization'])
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    // Retrieve the JWT secret key 
    let jwtSecret = "apple";//await accessSecret();
    if (!jwtSecret) {
        return res.status(400).json({message: 'Access Failed: Server Error retrieving secret key' });}
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
            return res.status(400).json({message: 'Access Failed: Token expired for current user. Please log in again' });
        }
        // If the token seems to have an invalid signature (JsonWebTokenError) *someone tempered with it* or other errors
        return res.status(400).json({message: 'Access Failed: Invalid token or Misformed token' });
    }
  } else {
    return res.status(400).json({ message: 'Access Failed: Token not provided' });
  }
};

// Checks if user has admin priviledges
async function isAdmin(req: any, res: any, next: any) {
    console.log(req.admin)
    if (req.admin === true) {
      next();
    } else {
        return res.status(401).json({ message: "Insufficient permissions." });
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

    console.log(password)
    const sanitzed_password = sanitizeInput(password)
    console.log(sanitzed_password)
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

    const jsonString = JSON.stringify(packageAction);
    // Updates the packageAction field of a package in the datastore for the given repository ID.
    await updateRepoPackageAction(Number(packageRepo.ID), jsonString);
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


// Uploads default user to database upon registry reset
app.put('/', async (req, res) => {
    //uploadModuleToCloudStorage("testing_max", "1.5.0", ZIP_FILETYPE, "aGVsbG8gd29ybGQ=", 'ece461-repositories');
    const password =  "correcthorsebatterystaple123(!__+@**(A’”`;DROP TABLE packages;"
    const sanitzed_password = sanitizeInput(password)

    await addUser('ece30861defaultadminuser', sanitzed_password , true);
    // Code: 200  Default user is added
    res.sendStatus(200);
});


app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});