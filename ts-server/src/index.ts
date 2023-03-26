// authentication:
// https://cloud.google.com/docs/authentication/provide-credentials-adc

/*
 * imports
 */

import express from 'express';
import path from 'path';

require('dotenv').config();

const { Datastore } = require('@google-cloud/datastore')

/*
 *
 * global variables
 *
 */

const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";

const app = express();
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

async function addRepo(name: string, url: string, version: string) {
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

    await datastore.save(repo);
}

async function updateRepo(repoID: number, newName: string) {
    const transaction = datastore.transaction();
    const ds_key = datastore.key({
        namespace: NAMESPACE,
        path: [REPO_KIND, repoID],
    });
    try {
        await transaction.run();
        const [selectedRepo] = await transaction.get(ds_key);
        selectedRepo.name = newName;
        transaction.save({
            key: ds_key,
            data: selectedRepo
        });
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        console.log(`Something went wrong while trying to update repo ${repoID}`);
        console.log(err);
    }
}

/*
 * users db functions
 */

async function addUser(name: string, hashedPassword: string) {
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

    await datastore.save(user);
}

async function quickstart() {
    // code from:
    // https://www.npmjs.com/package/@google-cloud/datastore
    const namespace = "ece461"
    const kind = "repo";
    const name = "new_item";
    const taskKey = datastore.key([kind, name]);

    const task = {
        key: taskKey,
        data: {
            description: 'task description'
        },
    };

    await datastore.save(task);
    console.log(`saved ${task.key.name}: ${task.data.description}`)
}

/*
 * Rest API endpoints
 */

app.get('/packages', async (req, res) => {
    res.send("packages endpoint");
    await updateRepo(5634161670881280, "new_test2");
});

app.get('/reset', async (req, res) => {
    res.send("reset endpoint");
})

app.get('/package', async (req, res) => {
    res.send("package endpoint");
});

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
    res.sendFile(path.join(__dirname, HTML_PATH + "/index.html"));
    // res.send("index!");
});

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
});