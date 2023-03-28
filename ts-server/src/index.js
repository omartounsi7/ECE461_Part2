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
        console.log(`offset: ${offset}`);
        console.log(queries);
        // do db actions
    }
    // response
}));
app.get('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("reset endpoint");
}));
app.post('/package', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("package endpoint");
}));
app.get('/package/:id', (req, res) => {
    res.send("package/" + req.params.id + " endpoint");
});
app.get('/package/:id/rate', (req, res) => {
    res.send("package/" + req.params.id + "/rate endpoint");
});
app.get('/package/byName/:name', (req, res) => {
    res.send("package/byName/" + req.params.name + " endpoint");
    // parameters
    //  token: line 358
});
app.get('/package/byRegEx/:regex', (req, res) => {
    res.send("package/byRegEx/" + req.params.regex + " endpoint");
});
app.get('/authenticate', (req, res) => {
    res.send("authenticate endpoint");
});
/* * * * * * * * * * * * * * *
 * Website Serving endpoints *
 * * * * * * * * * * * * * * */
app.get("/packages", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // serve webpage
    res.sendFile(path_1.default.join(__dirname, HTML_PATH + "/packages.html"));
}));
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.sendFile(path_1.default.join(__dirname, HTML_PATH + "/index.html"));
    // res.send("index!");
    // await addRepo("yeet1", "yeet.com", "1.0");
    // await addRepo("yeet_test", "google.com", "4.3.2");
    // await addRepo("additional_repo","github", "1.2.2");
    // await addRepo("hacker_man", "lit_hub", "4.20.69");
    // await addRepo("fake_module", "mmm", "10.8.1");
    yield (0, modules_1.findRepo)("yeet1");
}));
app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});
