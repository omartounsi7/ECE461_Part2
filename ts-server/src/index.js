"use strict";
// authentication:
// https://cloud.google.com/docs/authentication/provide-credentials-adc
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
/*
 * imports
 */
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
require('dotenv').config();
const { Datastore } = require('@google-cloud/datastore');
/*
 *
 * global variables
 *
 */
const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";
const app = (0, express_1.default)();
const port = 8080;
const datastore = new Datastore();
// const projectId = process.env.PROJECT_ID;
/*
 *
 * datastore functions
 *
 */
const NAMESPACE = "ece461";
/*
 * repos db functions
 */
const REPO_KIND = "repo";
function addRepo(name, url, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const ds_key = datastore.key({
            namespace: NAMESPACE,
            path: [REPO_KIND]
        });
        const repo = {
            key: ds_key,
            data: [
                {
                    name: "name",
                    value: name
                },
                {
                    name: "creation-date",
                    value: new Date().toJSON(),
                    excludeFromIndexes: true
                },
                {
                    name: "url",
                    value: url
                },
                {
                    name: "version",
                    value: version
                }
            ]
        };
        yield datastore.save(repo);
    });
}
function updateRepo(repoID, newName) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = datastore.transaction();
        const ds_key = datastore.key({
            namespace: NAMESPACE,
            path: [REPO_KIND, repoID],
        });
        try {
            yield transaction.run();
            const [selectedRepo] = yield transaction.get(ds_key);
            selectedRepo.name = newName;
            transaction.save({
                key: ds_key,
                data: selectedRepo
            });
            yield transaction.commit();
        }
        catch (err) {
            yield transaction.rollback();
            console.log(`Something went wrong while trying to update repo ${repoID}`);
            console.log(err);
        }
    });
}
/*
 * users db functions
 */
function addUser(name, hashedPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const namespace = "ece461";
        const kind = "users";
        const ds_key = datastore.key({
            namespace: namespace,
            path: [kind]
        });
        const user = {
            key: ds_key,
            data: [
                {
                    name: "name",
                    value: name
                },
                {
                    name: "password",
                    value: hashedPassword,
                    excludeFromIndexes: true
                }
            ]
        };
        yield datastore.save(user);
    });
}
function quickstart() {
    return __awaiter(this, void 0, void 0, function* () {
        // code from:
        // https://www.npmjs.com/package/@google-cloud/datastore
        const namespace = "ece461";
        const kind = "repo";
        const name = "new_item";
        const taskKey = datastore.key([kind, name]);
        const task = {
            key: taskKey,
            data: {
                description: 'task description'
            },
        };
        yield datastore.save(task);
        console.log(`saved ${task.key.name}: ${task.data.description}`);
    });
}
/*
 * Rest API endpoints
 */
app.get('/packages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("packages endpoint");
    yield updateRepo(5634161670881280, "new_test2");
}));
app.get('/reset', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("reset endpoint");
}));
app.get('/package', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
});
app.get('/package/byRegEx/:regex', (req, res) => {
    res.send("package/byRegEx/" + req.params.regex + " endpoint");
});
app.get('/authenticate', (req, res) => {
    res.send("authenticate endpoint");
});
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, HTML_PATH + "/index.html"));
    // res.send("index!");
});
app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});
