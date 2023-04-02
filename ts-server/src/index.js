"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const modules_1 = require("./datastore/modules");
const datastore_1 = require("./datastore/datastore");
const ds_config_1 = require("./datastore/ds_config");
/* * * * * * * * * * *
 * global variables  *
 * * * * * * * * * * */
const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";
const app = (0, express_1.default)();
const port = 8080;
app.use(express_1.default.json());
/* * * * * * * * * * * *
 * Rest API endpoints  *
 * * * * * * * * * * * */
// Fetch directory of packages
app.post('/packages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    else {
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
}));
// Reset to default state
app.delete('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("reset endpoint");
    // get auth from header
    // look into https://jwt.io/
    //  let auth = req.header["X-Authorization"];
    // return 200 when registry is reset
    // return 400 for missing field/ invalid auth
    // return 401 for not enough permissions
}));
// Upload endpoint and module ingestion
app.post('/package', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("package endpoint");
    // get req content as PackageData schema
    // get auth from header
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
}));
// Download Endpoint
app.get('/package/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("package/" + req.params.id + " endpoint");
    let id = Number(req.params.id);
    const result = yield (0, datastore_1.doesIdExistInKind)(ds_config_1.MODULE_KIND, id);
    if (!result) {
        res.send("req.params.id doesn't exist in MODULE_KIND.");
        return;
    }
    // download package by ID
    res.send((0, modules_1.downloadRepo)(id));
    // default response:
    // unexpected error (what error code do we return)
    // code 200
    // return package schema json object
    //  includes: metadata and data
    // code 404
    // package DNE
}));
// Update Endpoint
app.put('/package/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
// Delete endpoint
app.delete('/package/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("package/" + req.params.id + " endpoint");
    // get package ID from path
    // 200
    // package successfully deleted
    // 400
    // malformed json/invalid auth
    // 404
    // package DNE
}));
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
    // package rating choked on at least one of the metrics
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
app.delete('/package/byName/:name', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // get package name from header
    // get auth token from header
    // 200
    // package successfully deleted
    // 400
    // malformed json/ invalid auth
    // 404
    // package DNE
}));
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
app.get("/packages", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // serve webpage
    console.log("hello world");
    res.sendFile(path_1.default.join(__dirname, HTML_PATH + "/packages.html"));
}));
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.sendFile(path_1.default.join(__dirname, HTML_PATH + "/index.html"));
    res.send("index!");
}));
app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});
