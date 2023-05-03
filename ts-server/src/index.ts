import express from 'express';
import path from 'path';
import * as ffi from 'ffi-napi';
import {getSecret, JWT_AUTH_SECRET} from "./cloud-storage/secret-key";

// npm install -g ts-node
// npm install --save ffi-napi @types/ffi-napi
import {
    addRepo,
    deleteRepo,
    findReposByName,
    findReposByNameAndVersion,
    getAllRepos,
    updateMetaData,
    updateRepoPackageAction,
    createRepoData,
    findModuleById,
    getRepoData,
    changeUrlField,
    getPopularityInfo,
    incrementDownloadCount
} from "./datastore/modules";
//import { addUser } from "./datastore/users";
import {doesIdExistInKind, resetKind} from "./datastore/datastore";
import {MODULE_KIND, USER_KIND} from "./datastore/ds_config";
import { MODULE_STORAGE_BUCKET, SECRET_STORAGE_BUCKET } from "./cloud-storage/cs_config";
import { uploadModuleToCloudStorage, uploadBase64FileToCloudStorage, getCloudStoragefileAsUTF8, getModuleFromCloudStorage, cloudStorageFilePathBuilder, deleteModuleFromCloudStorage, resetCloudStorage, ZIP_FILETYPE, TXT_FILETYPE } from "./cloud-storage/cloud-storage";
import { addUser , findUserByName, userLogin, updateApiCounter, deleteUser} from "./datastore/users"
import { logRequest } from "./cloud-storage/logging";

const fs = require('fs');
const JSZip = require('jszip');
const { promisify } = require('util');
const zipdir = require('zip-dir');
const { execSync } = require('child_process');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
/* * * * * * * * * * *
 * global variables  *
 * * * * * * * * * * */

const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";
const app = express();
const port = 8080;

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
app.post('/packages', async (req, res) => {
    await logRequest("post", "/packages", req);

    if(!await authenticateJWT(req, res)) {
        return;
    }
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

    let queries = req.body;
    let offset = req.headers.offset;

    // console.log(`Got /package post request`);

    // validate post request
    if (typeof queries === undefined || offset === undefined) {
        // invalid request
        res.status(400).send({message:"There is missing field(s) in the PackageQuery/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
        return;
    } else {
        let packages: {Version: any, Name: any, ID: any}[] = [];
        // there are 1 more more queries and an offset is given. The request is valid.
         // do db actions
        let offset_num = Number(offset);
        if(isNaN(offset_num)) {
            res.status(400).send({message:"There is missing field(s) in the PackageQuery/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
            return;
        }
        try {
            for (const e of queries) {
                let versions = e["Version"];
                let name = e["Name"];
                if(versions === undefined || name === undefined) {
                    res.status(400).send({message:"There is missing field(s) in the PackageQuery/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
                    return;
                }
                // console.log(e)
                const regex = /\((.*?)\)/g;
                let matches_ = versions.match(regex)
                let matches: string[] = [];
                matches_.forEach((match: String) => {
                        matches.push(match.substring(1, match.length - 1));
                });
                for (const version of matches) {
                    let matched_repos = await findReposByNameAndVersion(name, version);
                    if(matched_repos === -1) {
                        res.status(400).send({message:"Invalid Version Format"});
                        return;
                    }
                    matched_repos.forEach((repo: any) => {
                        let version = repo["version"];
                        let id = repo["metaData"]["ID"];
                        // let id = repo["id"];
                        // console.log(`found repo: ${name} ${id} ${version}`)
                        packages.push({"Version": version, "Name": name, "ID": id });
                        // packages.push(repo["metadata"].clone())
                        // console.log(`found repo: ${repo["metadata"]}`)
                    });
                }
            }
        } catch(e: any) {
            res.status(400).send({message:"There is missing field(s) in the PackageQuery/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
            //console.log(e)
            return;
        }
        let results;
        // page nate here
        const max_per_page = 10;
        if(packages.length < offset_num * max_per_page) {
            results = packages.slice(0,10);
        } else {
            results = packages.slice(offset_num * max_per_page, max_per_page);
        }
        // send results here
        res.status(200).json(results);
        return
    }


    // response

});

// Reset the registry to a system default state (an empty registry with the default user))
app.delete('/reset', async (req, res) => {
    await logRequest("delete", "/reset", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // deletes all modules stored in firestore
    await resetKind(MODULE_KIND);
    // deletes all users stored in firestore (add the default user in return function)
    await resetKind(USER_KIND);

    // deletes all packages stored in Google Cloud storage
    await resetCloudStorage(MODULE_STORAGE_BUCKET);

    // add the default admin account for the autograder
    const password =  "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
    const sanitzed_password = sanitizeInput(password)
    await addUser('ece30861defaultadminuser', sanitzed_password , true);

    // Code: 200  Registry is reset
    return res.status(200).send({message: "Registry is reset"});
})

// Upload endpoint and module ingestion
app.post('/package', async (req, res) => {
    //console.log("In package")
    await logRequest("post", "/package", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    /*
    Content: string *The uploaded content is a zipped version of the package*
    Package contents: zip file uploaded by the user. (Encoded as text using a Base64 encoding)

    This will be a zipped version of an npm package's GitHub repository, minus the ".git/" directory." 
    It will, for example, include the "package.json" file that can be used to retrieve the project homepage.
    See https://docs.npmjs.com/cli/v7/configuring-npm/package-json#homepage.
    */
    const base64String: string = req.body["Content"];

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
        const result = await decodeBase64(base64String, JSProgram, res, req);
        //console.log('Error in decodeBase64:', result.message);

        if (result.message.includes("homepage URL is missing in package.json")){
            return res.status(400).send({message: result.message});
        }
        
        if (result.message.includes("Package exists already")){
            return res.status(409).send({message: 'Package exists already'});
        }
        
        if (result.message.includes("package.json file is missing")){
            return res.status(400).send({message: 'Package.json file is missing'});      
        }
        
        if (result.message.includes("Failed to add repository:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error updating metadata:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Failed to get package name or version from package.json")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Invalid Version Format")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error parsing package.json file")){
            return res.status(400).send({message: "Error parsing package.json file/Missing package.json file"});
        }

        if (result.message.includes("Success")){
            return;
        }

        if (result.message.includes("Error uploading readme file:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error checking if package exists:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error uploading package to cloud storage:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error decoding Base64 string:")){
            return res.status(400).send({message: result.message});
        }

        if (result.message.includes("Error loading zip file:")){
            return res.status(400).send({message: result.message});
        }
    } 

    // Package URL (for use in public ingest) is passed in req.body
    if (url) {

        // 1. DO RATING of Package URL (for use in public ingest).
        // Write the url to a file called URLs.txt
        fs.writeFileSync('URLs.txt', url);

        // Define the type signature of the Rust function
        const handle_url_file = ffi.Library('libgrrs.so', {
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
            return;
        } 
        
        try {
            const parts = url.split('/');
            const cloneDir = './' + parts[parts.length - 1];
            const zipdirAsync = promisify(zipdir);
            
            let base64String;

            try {
                // Clones the GitHub package locally
                execSync(`git clone ${url} ${cloneDir}`);

                // Removes the .git directory
                const gitDir = `${cloneDir}/.git`;
                if (fs.existsSync(gitDir)) {
                    fs.rmSync(gitDir, { recursive: true, force: true });
                }
                // Creates a zipped file
                const buffer: Buffer = await zipdirAsync(cloneDir, { saveTo: cloneDir + '.zip' });

                // Encodes the zipped file to a Base64-encoded string
                base64String = Buffer.from(buffer).toString('base64');
                
                const result = await decodeBase64(base64String, JSProgram, res, req);
                            
                if (result.message.includes("homepage URL is missing in package.json")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }
                
                if (result.message.includes("Package exists already")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(409).send({message:'Bad Request: Package exists already'});
                }
                
                if (result.message.includes("Failed to add repository:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error updating metadata:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Failed to get package name or version from package.json")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Invalid Version Format")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error parsing package.json file")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: "Error parsing package.json file/Missing package.json file"});
                }

                if (result.message.includes("Success")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    //console.log("Success!");
                    return;
                }

                if (result.message.includes("Error uploading readme file:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error checking if package exists:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error uploading package to cloud storage:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error decoding Base64 string:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

                if (result.message.includes("Error loading zip file:")){
                    // Remove the locally downloaded GitHub directory
                    fs.rmdirSync(cloneDir, { recursive: true });
                    return res.status(400).send({message: result.message});
                }

            } catch (err: any) {
                return res.status(400).send({message: 'Error creating zip file: ' + err.message });
            }
        } catch (err: any) {
            res.status(424).send({message: 'Error encountered encoding Base64 string: '});
            return;
        }
    }
});

async function decodeBase64(base64String: string, JSProgram: string, res: any, req: any) {

    // Will store the package name from package.json
    let packageName;

    // Will store the package version from package.json
    let packageVersion;

    // Will store the README path of the uploaded package
    let readmePath;

    // Will store the README content of the uploaded package
    let readmeContent;

    // Will store `homepage` URL (links to the GitHub repository) from package.json
    let packageURL;

    // Will store the new package ID
    let newPackageID;

    // Will store the new metadata contents
    let metadata;

    try {
        // Decode the Base64 string
        const buffer = Buffer.from(base64String, 'base64');

        let zip;
        try {
            // Load the zip file using JSZip
            zip = await JSZip.loadAsync(buffer);
        } catch (err: any) {
            return { statusCode: 400, message: 'Error loading zip file: ' + err.message };
        }

        let packageJsonFiles: any[] = [];
        let readmeFiles: any[] = [];

        zip.forEach((relativePath: any, zipEntry: any) => {
            if (relativePath.endsWith('package.json')) {
                packageJsonFiles.push(zipEntry);
            }
            if (relativePath.endsWith('README.md')) {
                readmeFiles.push(zipEntry);
            }
        });

        let packageJsonFile: any;
        let readmeFile: any;

        // Choose the package.json file closest to the root folder
        if (packageJsonFiles.length > 0) {
            packageJsonFiles.sort((a, b) => {
                return a.name.split('/').length - b.name.split('/').length;
            });
            packageJsonFile = packageJsonFiles[0];
        }

        // Choose the README.md file closest to the root folder
        if (readmeFiles.length > 0) {
            readmeFiles.sort((a, b) => {
                return a.name.split('/').length - b.name.split('/').length;
            });
            readmeFile = readmeFiles[0];
        }

        try {
            // Extract the package.json file
            const packageJsonContent = await packageJsonFile.async('string');

            // Parse the package.json content as a JSON object
            const packageJson = JSON.parse(packageJsonContent);

            // Extract the name and version fields from package.json
            packageName = packageJson.name;
            packageVersion = packageJson.version;

            // Extract`homepage` URL (links to the GitHub repository) from package.json
            packageURL = packageJson.homepage;

            if (!packageURL) {
                return { statusCode: 400, message: 'Bad Request: homepage URL is missing in package.json' };
            }
        } catch (err: any) {
            // The package.json file does not exist in the zip file
            // Return an appropriate HTTP error code like 400 Bad Request
            return { statusCode: 400, message: 'Error parsing package.json file/Missing package.json file' };
        }

        if (packageName === undefined || packageVersion === undefined) {
            return { statusCode: 400, message: "Failed to get package name or version from package.json" };
        }

        if (readmeFile) {
            try {
                readmeContent = await readmeFile.async('text');
                await uploadModuleToCloudStorage(packageName, packageVersion, TXT_FILETYPE, readmeContent, MODULE_STORAGE_BUCKET);
                readmePath = cloudStorageFilePathBuilder(packageName + "." + TXT_FILETYPE, packageVersion);
            } catch (err: any) {
                return { statusCode: 400, message: 'Error uploading readme file: ' + err.message };
            }
        }

        try {
            // Checks if package already exists in database
            const result = await findReposByNameAndVersion(packageName, packageVersion);
            if(result === -1) {
                return { statusCode: 400, message: 'Invalid Version Format' };
            }
            if (result.length > 0) {
                return { statusCode: 409, message: 'Conflict: Package exists already' };
            }
        } catch (err: any) {
            return { statusCode: 400, message: 'Error checking if package exists: ' + err.message };
        }

        try {
            const cloudStoragePath = cloudStorageFilePathBuilder(packageName + ".zip", packageVersion);
            // attempt to create and save new package to database
            let data = createRepoData(packageName, packageVersion, new Date().toISOString(), packageURL, undefined, readmePath, undefined, cloudStoragePath)
            newPackageID = await addRepo(data);
            if (Number(newPackageID) === 0){
                throw new Error("ID of 0")
            }
        } catch (err: any) {
            return { statusCode: 400, message: 'Failed to add repository: ' + err.message };
        }

        // Create a JavaScript object with the metadata
        metadata = {
            "Name": packageName,
            "Version": packageVersion,
            "ID": newPackageID
        };

        if (newPackageID) {
            try {
                // update meta data field in firestore
                await updateMetaData(newPackageID, metadata);
            } catch (err: any) {
                return { statusCode: 400, message: 'Error updating metadata: ' + err.message };
            }
        }

        // logs user action for this package
        await logPackageActionEntry("CREATE", req, metadata);

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
        };

        try {
            // Uploads module to Google Cloud Storage
            await uploadModuleToCloudStorage(packageName, packageVersion, ZIP_FILETYPE, base64String, MODULE_STORAGE_BUCKET);
        } catch (err: any) {
            return { statusCode: 400, message: 'Error uploading package to cloud storage: ' + err.message };
        }
        
        // 201 Success. Check the ID in the returned metadata for the official ID.
        res.status(201).json(responseObject);
        return { statusCode: 201, message: "Success" };
    } catch (err: any) {
        // if something errors in-between
        return { statusCode: 400, message: 'Error decoding Base64 string: ' + err.message };
    }
}

async function decodeBase64OnUpdate(base64String: string, JSProgram: string, res: any, req: any, packageID: string) {

    // Will store the package name from package.json
    let packageName;

    // Will store the package version from package.json
    let packageVersion;

    // Will store the README path of the uploaded package
    let readmePath;

    // Will store the README content of the uploaded package
    let readmeContent;

    // Will store `homepage` URL (links to the GitHub repository) from package.json
    let packageURL;

    try {
        // Decode the Base64 string
        const buffer = Buffer.from(base64String, 'base64');

        let zip;
        try {
            // Load the zip file using JSZip
            zip = await JSZip.loadAsync(buffer);
        } catch (err: any) {
            return { statusCode: 400, message: 'Error loading zip file: ' + err.message };
        }

        let packageJsonFiles: any[] = [];
        let readmeFiles: any[] = [];

        zip.forEach((relativePath: any, zipEntry: any) => {
            if (relativePath.endsWith('package.json')) {
                packageJsonFiles.push(zipEntry);
            }
            if (relativePath.endsWith('README.md')) {
                readmeFiles.push(zipEntry);
            }
        });

        let packageJsonFile: any;
        let readmeFile: any;

        // Choose the package.json file closest to the root folder
        if (packageJsonFiles.length > 0) {
            packageJsonFiles.sort((a, b) => {
                return a.name.split('/').length - b.name.split('/').length;
            });
            packageJsonFile = packageJsonFiles[0];
        }

        // Choose the README.md file closest to the root folder
        if (readmeFiles.length > 0) {
            readmeFiles.sort((a, b) => {
                return a.name.split('/').length - b.name.split('/').length;
            });
            readmeFile = readmeFiles[0];
        }

        try {
            // Extract the package.json file
            const packageJsonContent = await packageJsonFile.async('string');

            // Parse the package.json content as a JSON object
            const packageJson = JSON.parse(packageJsonContent);

            // Extract the name and version fields from package.json
            packageName = packageJson.name;
            packageVersion = packageJson.version;

            // Extract`homepage` URL (links to the GitHub repository) from package.json
            packageURL = packageJson.homepage;

            if (!packageURL) {
                return { statusCode: 400, message: 'Bad Request: homepage URL is missing in package.json' };
            }
        } catch (err: any) {
            // The package.json file does not exist in the zip file
            // Return an appropriate HTTP error code like 400 Bad Request
            return { statusCode: 400, message: 'Error parsing package.json file/Missing package.json file' };
        }

        if (packageName === undefined || packageVersion === undefined) {
            return { statusCode: 400, message: "Failed to get package name or version from package.json" };
        }

        try {
            // Uploads module to Google Cloud Storage
            await uploadModuleToCloudStorage(packageName, packageVersion, ZIP_FILETYPE, base64String, MODULE_STORAGE_BUCKET);
        } catch (err: any) {
            return { statusCode: 400, message: 'Error uploading package to cloud storage: ' + err.message };
        }

        if (readmeFile) {
            try {
                readmeContent = await readmeFile.async('text');
                await uploadModuleToCloudStorage(packageName, packageVersion, TXT_FILETYPE, readmeContent, MODULE_STORAGE_BUCKET);
                readmePath = cloudStorageFilePathBuilder(packageName + "." + TXT_FILETYPE, packageVersion);
            } catch (err: any) {
                return { statusCode: 400, message: 'Error uploading readme file: ' + err.message };
            }
        }

        try {  
            // Call the changeUrlField function in modules.ts to change the URL 
            // field with the URL field extracted from the ReadMe
            await changeUrlField(packageID, packageURL);
        } catch (err: any) {
            return { statusCode: 400, message: 'Error uploading package to cloud storage: ' + err.message };
        }

        // 201 Success.
        return { statusCode: 201, message: "Success" };
    } catch (err: any) {
        // if something errors in-between
        return { statusCode: 400, message: 'Error decoding Base64 string: ' + err.message };
    }
}

// Download Endpoint (For download you should only set the Content field.)
app.get('/package/:id', async (req, res) => {
    await logRequest("get", "/package/:id", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    if (!req.params.id) {
        return res.status(400).send({message: "There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
    }

    if (req.params.id === '0') {
        return res.status(400).send({message: "Package ID cannot be 0"});
    }

    let id = Number(req.params.id);
    if(isNaN(id)) {
        return res.status(400).send({message: "There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid."});
    }

    const result = await doesIdExistInKind(MODULE_KIND, id)
    if(!result){
        return res.status(404).send({message: "Package does not exist."});
    }

    // download package by ID
    let packageInfo = await getRepoData(id);

    if("password" in packageInfo){
        delete packageInfo.password;
    }
    if("is_admin" in packageInfo){
        delete packageInfo.is_admin;
    }

    if(packageInfo.name === undefined || packageInfo.version === undefined || packageInfo.metaData === undefined) {
        res.status(400).send("There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.")
        return;
    }

    let module = await getModuleFromCloudStorage(packageInfo.name, packageInfo.version, ZIP_FILETYPE, MODULE_STORAGE_BUCKET);
    let metaData = packageInfo.metaData;

    // ACTION: DOWNLOAD
    await logPackageActionEntry("DOWNLOAD", req, metaData);

    await incrementDownloadCount(req.params.id);

    // return package schema json object
    //  includes: metadata and data
    let returnObject = {
        "metadata": metaData,
        "data": {
            "Content": module
        }
    }
    // console.log(returnObject);
    return res.status(200).json(returnObject);
});

// Update Endpoint
app.put('/package/:id', async (req, res) => {
    await logRequest("put", "/package/:id", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    if (req.params.id === '0') {
        return res.status(400).send({message: "Package ID cannot be 0"});
    }
    // On package update, exactly one field should be set.
    // The package contents (from PackageData) will replace the previous contents.
    const packageContents = req.body["data"]["Content"];
    const url = req.body["data"]["URL"];
    const JSProgram = req.body["data"]["JSProgram"];

    // On package upload, either Content or URL should be set. If both are set, returns 400.
    if (packageContents && url) {
        return res.status(400).send({message: "Both 'Content' and 'URL' cannot be provided at the same time."});
    } else if (!packageContents && !url) {
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
    if (!entry) {
        return res.status(404).json({ message: "Package does not exist" });
    }

    const packageName = req.body["metadata"]["Name"];
    const packageVersion = req.body["metadata"]["Version"];
    const packageID: string = req.body["metadata"]["ID"];

    if (!packageName || !packageVersion || !packageID) {
        return res.status(400).send({message: "There is missing field(s) in the PackageID"});
    }

    if (packageID === "0"){
        return res.status(400).send({message: "Package ID cannot be 0"});
    }

    // The name, version, and ID must match.
    if ((entry.name === packageName) && (entry.version == packageVersion) && (entry.metaData.ID=== packageID)) {

        // if packageContents field is set
        if (packageContents) {

            // Verify that the new 64-based encoded packageContents are legit!
            const result = await decodeBase64OnUpdate(packageContents, JSProgram, res, req, packageID);

            if (result.message.includes("homepage URL is missing in package.json")){
                return res.status(400).send({message: result.message});
            }
    
            if (result.message.includes("Failed to get package name or version from package.json")){
                return res.status(400).send({message: "Failed to get package name or version from package.json"});
            }
    
            if (result.message.includes("Error parsing package.json file")){
                return res.status(400).send({message: result.message});
            }
    
            if (result.message.includes("Error uploading readme file:")){
                return res.status(400).send({message: result.message});
            }
    
            if (result.message.includes("Error uploading package to cloud storage:")){
                return res.status(400).send({message: result.message});
            }
    
            if (result.message.includes("Error decoding Base64 string:")){
                return res.status(400).send({message: result.message});
            }
    
            if (result.message.includes("Error loading zip file:")){
                return res.status(400).send({message: result.message});
            }

            if (result.message.includes("Success")){
                // ACTION: UPDATE
                await logPackageActionEntry("UPDATE", req, req.body["metadata"]);

                // 200: Version is updated.
                // Package contents from PackageData schema will replace previous contents
                return res.status(200).json({ message: "Version is updated" });
            }
        } 

        // if packageURL field is set
        if (url) {
            // 1. DO RATING of Package URL (for use in public ingest).
            // Writes the url to URLs.txt
            fs.writeFileSync('URLs.txt', url);

            // Define the type signature of the Rust function
            const handle_url_file = ffi.Library('libgrrs.so', {
                'handle_url_file': ['void', ['string', 'string', 'int']]
            }).handle_url_file;

            // Calls the Rust wrapper function
            handle_url_file("URLs.txt", "example.log", 1);

            // Reads the contents of the metrics.txt file
            const metrics = fs.readFileSync('metrics.txt', 'utf-8');
            
            // Parses the JSON string into a JavaScript object
            const metricsObject = JSON.parse(metrics);
            
            // Extracts the properties from metricsObject
            const netScore = parseFloat(metricsObject.NET_SCORE);
            const rampUp = parseFloat(metricsObject.RAMP_UP_SCORE);
            const correctness = parseFloat(metricsObject.CORRECTNESS_SCORE);
            const busFactor = parseFloat(metricsObject.BUS_FACTOR_SCORE);
            const responsiveMaintainer = parseFloat(metricsObject.RESPONSIVE_MAINTAINER_SCORE);
            const license = parseFloat(metricsObject.LICENSE_SCORE);
            const codeReview = parseFloat(metricsObject.CODE_REVIEW);
            const version = parseFloat(metricsObject.Version_Pinning);

            // Checks if the package meets the required scores
            if (netScore < 0.5 || rampUp < 0.5 || correctness < 0.5 || busFactor < 0.5 || responsiveMaintainer < 0.5 ||
                license < 0.5 || codeReview < 0.5 || version < 0.5) {
                res.status(424).send({message: 'Package is not uploaded due to the disqualified rating'});
                return;
            } 
            
            try {
                const parts = url.split('/');
                const cloneDir = './' + parts[parts.length - 1];
                const zipdirAsync = promisify(zipdir);
                
                let base64String;

                try {
                    // Clones the GitHub package locally
                    execSync(`git clone ${url} ${cloneDir}`);

                    // Removes the .git directory
                    const gitDir = cloneDir + "/.git";

                    // If the directory already exists 
                    if (fs.existsSync(gitDir)) {
                        fs.rmSync(gitDir, { recursive: true, force: true });
                    }
                    // Creates a zipped file
                    const buffer: Buffer = await zipdirAsync(cloneDir, { saveTo: cloneDir + '.zip' });

                    // Encodes the zipped file to a Base64-encoded string
                    base64String = Buffer.from(buffer).toString('base64');

                    // Verifies that the new 64-based encoded packageContents are legit!
                    const result = await decodeBase64OnUpdate(base64String, JSProgram, res, req, packageID);
                                
                    if (result.message.includes("homepage URL is missing in package.json")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }
                    
                    if (result.message.includes("Failed to get package name or version from package.json")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }

                    if (result.message.includes("Error parsing package.json file")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: "Error parsing package.json file/Missing package.json file"});
                    }

                    if (result.message.includes("Success")){
                        // Removes the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        //console.log("Success!");

                        // ACTION: UPDATE
                        await logPackageActionEntry("UPDATE", req, req.body["metadata"]);

                        // 200 Version is updated.
                        // The package contents from PackageData schema will replace previous contents
                        return res.status(200).json({ message: "Version is updated" });
                    }

                    if (result.message.includes("Error uploading readme file:")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }

                    if (result.message.includes("Error uploading package to cloud storage:")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }

                    if (result.message.includes("Error decoding Base64 string:")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }

                    if (result.message.includes("Error loading zip file:")){
                        // Remove the locally downloaded GitHub directory
                        fs.rmdirSync(cloneDir, { recursive: true });
                        return res.status(400).send({message: result.message});
                    }

                } catch (err: any) {
                    return res.status(400).send({message: 'Error creating zip file: ' + err.message });
                }
            } catch (err: any) {
                res.status(424).send({message: 'Error encountered encoding Base64 string: '});
                return;
            }
        }

    } else {
        return res.status(404).json({ message: "Package Metadata mismatch with provided data" });
    }


});

// Update Endpoint Helper Function (Client Side)
app.get('/packageMeta/:id', async (req, res) => {
    let id = Number(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "There is a missing field in the PackageID" });
    }
    if (id === 0) {
        return res.status(400).json({ message: "Package ID cannot be 0" });
    }

    const result = await doesIdExistInKind(MODULE_KIND, id)
    if(!result){
        return res.status(404).json({ message: "Package does not exist" });
    }
    // The name, version, and ID must match.
    const entry = await findModuleById(id);
    if (!entry){
        return res.status(404).json({ message: "Package does not exist" });
    }

    // retreieves the package metadata
    const packageMetaData = entry["metaData"];
    
    return res.status(200).json(packageMetaData);
});

// Delete endpoint
app.delete('/package/:id', async (req, res) => {
    await logRequest("delete", "/package/:id", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    if (req.params.id === '0') {
        return res.status(400).send({message: "Package ID cannot be 0"});
    }

    const id = req.params.id;
    // Check for missing id field in request
    if (!id) {
        return res.status(400).json({message: 'Package ID is required'});
    }

    const record = await findModuleById(Number(id));
    if (record) {
        await deleteRepo(Number(id));
        await deleteModuleFromCloudStorage(record.cloudStoragePath, MODULE_STORAGE_BUCKET);
        return res.status(200).json({ message: "Package is deleted" });
    } else {
        return res.status(404).json({ message: "Package does not exist" });
    }
});

// (call logPackageAction), ACTION: RATE
app.get('/package/:id/rate', async (req, res) => {
    await logRequest("get", "/package/:id/rate", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    if (req.params.id === '0') {
        return res.status(400).send({message: "Package ID cannot be 0"});
    }

    // Extract package ID and authentication token from request params and headers
    const packageID = Number(req.params.id);

    const result = await doesIdExistInKind(MODULE_KIND, packageID)
    if(!result){
        // 404: Package does not exist.
        res.status(404).send({message: 'Package does not exist'});
        return;
    }
    // Download the package entity
    const packageRepo = await getRepoData(packageID);

    // Needed for Rate
    const url = packageRepo.url;

    // Write the url to a file called URLs.txt
    fs.writeFileSync('URLs.txt', url);

    // Define the type signature of the Rust function
    const handle_url_file = ffi.Library('libgrrs.so', {
      'handle_url_file': ['void', ['string', 'string', 'int']]
    }).handle_url_file;

    // Call the Rust function and output the result to the console
    handle_url_file("URLs.txt", "example.log", 1);
    
    console.log("Success, Rate works!!!");

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

      // ACTION: RATE
      await logPackageActionEntry("RATE", req, packageRepo.metaData);
  
      // 200: Only send a 200 response if each metric was computed successfully
      if (busFactor && correctness && rampUp && responsiveMaintainer && license && version && codeReview && netScore) {
        // Send the response object to the client
        return res.status(200).json(responseObject);
      } else {
        // 500: The package rating system choked on at least one of the metrics.
        return res.status(500).send({message: 'The package rating system choked on at least one of the metrics'});
      }
    } catch (error) {
      // If there was an error parsing the JSON string
      res.status(400).send({ message: 'Malformed json in Rate' });
      return;
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
    await logRequest("get", "/package/byName/:name", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }

    try {
      // get package name from header
      const packageName = req.params.name;

      if (!packageName){
        return res.status(400).json({message: 'There is missing field(s) in the PackageName'});
      }

      // PackageName Schema
      // - Names should only use typical "keyboard" characters.
      // - The name "*" is reserved. See the `/packages` API for its meaning.
      
      // Check if the package name adheres to the naming conventions
      if (!nameConv(packageName) || packageName === '*') {
        // 400 - invalid package name
        return res.status(400).json({message: 'Invalid package name'});
      } else {
        // Retrieve all packages from the datastore with that package name
        const allPackages = await findReposByName(packageName);
    
        if (allPackages.length === 0) {
            // 404 - package does not exist
            return res.status(404).json({message: 'Package does not exist'});
        } else {
             // Combine the packageAction fields of all packages into a single array
            const combinedActions = allPackages.reduce((acc:any, pkg:any) => {
                const packageActions = pkg.packageAction.map((action:any) => {
                    // Parse the stringified packageAction object
                    return JSON.parse(action);
                });
                return acc.concat(packageActions);
            }, []);

            // 200 - list of combined packageAction fields
            return res.status(200).json(combinedActions);
        }
      }
    } catch (error) {
      // 400 - malformed JSON or invalid authentiation
      return res.status(400).json({message: 'Bad request'});
    }
});

// Deletes all versions of a package from the datastore with the given name.
app.delete('/package/byName/:name', async (req, res) => {
    await logRequest("delete", "/package/byName/:name", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // get package name from header
    const packageName: string = req.params.name;

    if (!packageName){
        return res.status(400).json({message: 'Package Name is required'});
    }
    
    // Check if the package name adheres to the naming conventions
    if (!nameConv(packageName) || packageName === '*') {
        // 400 - invalid package name
        return res.status(400).json({message: 'Invalid package name'});
    } else {
        // Retrieve all packages from the datastore with that package name
        const allPackages = await findReposByName(packageName);

        if (allPackages.length === 0) {
            // 404 - package does not exist
            return res.status(404).json({message: 'Package does not exist'});
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
            return res.status(200).json({ message: `All versions of package ${packageName} have been deleted` });
        }
    }
});

// We use the authenticateJWT middleware function to protect routes that require 
// authentication, like the /package/byRegEx endpoint
// Get any packages fitting the regular expression
app.post('/package/byRegEx', async (req, res) => {
    await logRequest("post", "/package/byRegEx", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // Check if the request has a JSON body
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Malformed JSON: Request must have a JSON body.' });
    }
    // Check if the 'regex' field is present in the request body
    const regex = req.body["RegEx"];
    console.log(regex)
    if (!regex) { 
        return res.status(400).json({ message: 'Malformed JSON: Request must include a regex field.' });
    }

    if (regex === '*') { 
        return res.status(400).json({ message: 'Invalid Regex: Regex cannot just be a *' });
    }
    
    // Retrieve all packages from the datastore
    const allPackages = await getAllRepos();

    try {
        const filteredResults = await Promise.all(
            allPackages.map(async (pkg: any) => {
              if (pkg.name === undefined || pkg["metaData"]["Version"] === undefined) {
                throw new Error('There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.');
              }
              // If readme is not stored in gcp, test regex on package name only
              if (pkg.readme === undefined) {
                if (new RegExp(regex).test(pkg.name)) {
                    return new RegExp(regex).test(pkg.name);
                }
              
              } else {
                // Retrieve the readme stored from Google Cloud Storage
                const readme_content = await getCloudStoragefileAsUTF8(pkg.readme, MODULE_STORAGE_BUCKET);
                return new RegExp(regex).test(pkg.name) || new RegExp(regex).test(readme_content);
              }
            })
          );
          
        const passingPackages = allPackages.filter((pkg:any, i:any) => filteredResults[i]);

        // Extract the name and version of each matching package
        const response = passingPackages.map((pkg: { name: any; version: any; }) => {
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
app.get('/package/:id/upload_info', async (req, res) => {
    await logRequest("get", "/package/:id/upload_info", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
  // Extract package ID and authentication token from request params and headers
  const packageID = Number(req.params.id);

  const result = await doesIdExistInKind(MODULE_KIND, packageID)
  if(!result){
      // 404: Package does not exist.
      res.status(404).send({message: 'Package does not exist'});
      return;
  }
  // Get the package information by id
  const packageRepo = await getRepoData(packageID);
  res.send({"name": packageRepo.name, "date": packageRepo["creation-date"]});
  return;
});


async function authenticateJWT(req: any, res: any) {

  // Retrieve the value of the 'X-Authorization' header from the request headers
  const authHeader = req.headers['X-Authorization'] || req.headers['x-authorization']; 
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    // Retrieve the JWT secret key 
    let jwtSecret = await getSecret(JWT_AUTH_SECRET);
    if (!jwtSecret) {
        res.status(400).json({message: 'Access Failed: Server Error retrieving secret key' });
        return false;
    }
    try {
        const decodedToken = jwt.verify(token, jwtSecret);

        // Decrement API counter in database by one every time an API endpoint is called
        const apiCounterError = await updateApiCounter(decodedToken.id);
        if (apiCounterError) {
            throw new Error('API counter went below 0');
        }
        // Admin boolean of current user will be passed to the next middleware function 
        req.admin = decodedToken.admin; 
        return true;
    } catch (err: any) {
        // If the token is expired or used more than 1000 times
        if (err instanceof jwt.TokenExpiredError || (typeof err.message === 'string' && err.message === 'API counter went below 0')) {
            // Generate a new token by asking the user to log back in!
            res.status(400).json({message: 'Access Failed: Token expired for current user. Please log in again' });
            return false;
        }
        // If the token seems to have an invalid signature (JsonWebTokenError) *someone tempered with it* or other errors
        res.status(400).json({message: 'Access Failed: Invalid token or Misformed token' });
        return false;
    }
  } else {
    res.status(400).json({ message: 'Access Failed: Token not provided' });
    return false;
  }
}

// Checks if user has admin priviledges
async function isAdmin(req: any, res: any) {
    if (req.admin === true) {
        return true;
    } else {
        res.status(401).json({ message: "Insufficient permissions." });
        return false;
    }
}

app.get('/isAdmin', async (req, res) => {
    await logRequest("get", "/isAdmin",req);
    if (!await authenticateJWT(req, res)) {
        return;
    }
    if(!await isAdmin(req, res)) {
        return;
    }

    return res.status(200).json({ message: "User is an admin." });
});


// When the user first logs-in
async function authentication(req: any, res: any) {
    await logRequest("put", "authentication", req);

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
    let authToken =  await userLogin(username, isadmin, sanitzed_password);
    if (authToken === "") {
        return res.status(401).json({message: 'Username or Password is invalid!'});
    } else {
        return res.status(200).json('bearer ' + authToken);
    }
}

app.put('/authenticate', authentication);


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
    const now = new Date().toISOString();
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
    return;
}


async function logPackageActionEntry(action: string, req: any, metadata: any) {
    // Define the JWT secret (this should be stored securely and not hard-coded)
    const jwtSecret = await getSecret(JWT_AUTH_SECRET);
  
    // Retrieve the value of the 'X-Authorization' header from the request headers
    const authHeader = req.headers['X-Authorization'] || req.headers['x-authorization']; 
    const authToken = (authHeader as string).split(' ')[1];
  
    // Decode the JWT token and extract the payload
    const decodedToken = jwt.verify(authToken, jwtSecret.toString());
  
    // Find the user name by decoding the JWT_TOKEN
    const userName = decodedToken.name;
  
    // Find whether the user is an admin by decoding the JWT_TOKEN
    const isAdmin = decodedToken.admin;
  
   // Package Action: STRING
    await logPackageAction(userName, isAdmin, metadata, action);
    return;
}


app.get('/user/:name', async (req, res) => {
    await logRequest("get", "/user/:name", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // name of user we want to query
    const name = req.params.name;
    const results = await findUserByName(name);
    // return a boolean value based on the length of the results
    const boolValue = results.length > 0;
    return res.status(406).json({ message: boolValue });
});

app.post('/new_user', async (req, res) => {
    await logRequest("post", "/new_user", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // name of user we want to register
    const username = req.body["username"];
    const password = req.body["password"];
    const is_admin = req.body["admin"];
    const key = await addUser(username, password, is_admin);
    return res.status(201).json({ message: "User added successfully." });
});

// Reset to default state
app.delete('/user', async (req, res) => {
    await logRequest("delete", "/user",req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // Define the JWT secret (this should be stored securely and not hard-coded)
    let jwtSecret = await getSecret(JWT_AUTH_SECRET);

    // Retrieve the value of the 'X-Authorization' header from the request headers
    const authHeader = req.headers['X-Authorization'] || req.headers['x-authorization']; 

    if (authHeader) {
        const authToken = (authHeader as string).split(' ')[1];
        
        // Decode the JWT token and extract the payload
        const decodedToken = jwt.verify(authToken, jwtSecret.toString());
        // Find the user_id by decoding the JWT_TOKEN
        const userId = decodedToken.id;
        await deleteUser(userId);
        return res.status(200).json({message: "User deleted successfully"});
    }
});

// Non-baseline requirement
app.get("/popularity/:id", async (req, res) => {
    await logRequest("get", "/popularity/:id", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    // returns the download count of a module
    if(req.params.id === undefined) {
        res.status(400).send({message:"Malformed request."});
        return;
    }
    let id = Number(req.params.id);
    if(isNaN(id)) { return res.status(404).send({message:"ID does not exist."}); }
    let packageInfo = await  getRepoData(id);
    let download_count = Number(packageInfo.downloads);
    let body = { "downloads": download_count }
    return res.status(200).json(body);
});

/* * * * * * * * * * * * * * *
 * Website Serving endpoints *
 * * * * * * * * * * * * * * */

// Helper Function
app.put("/secret", async (req, res) => {
    await uploadBase64FileToCloudStorage("jwt_auth.txt", "apple", TXT_FILETYPE, SECRET_STORAGE_BUCKET);
    return res.status(200).send({message: "Secret added successfully"});
});

app.get("/packages", async (req, res) => {
    await logRequest("get", "/packages", req);
    if(!await authenticateJWT(req, res)) {
        return;
    }
    //console.log("Redirecting user to packages.html")
    // server webpage (If successfully logged in, redirect to packages.html)
    res.status(200).sendFile(path.join(__dirname, HTML_PATH + "/packages.html"));
});

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});
