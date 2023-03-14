import express from 'express';
import path from 'path';

const ASSETS_PATH = "../assets";
const HTML_PATH = ASSETS_PATH + "/html";

const app = express();
const port = 8080;

app.get('/packages', (req, res) => {
    res.send("packages endpoint");
})

app.get('/reset', (req, res) => {
    res.send("reset endpoint");
})

app.get('/package', (req, res) => {
    res.send("package endpoint");
})

app.get('/package/:id', (req, res) => {
    res.send("package/" + req.params.id + " endpoint");
})

app.get('/package/:id/rate', (req, res) => {
    res.send("package/" + req.params.id + "/rate endpoint");
})

app.get('/package/byName/:name', (req, res) => {
    res.send("package/byName/" + req.params.name + " endpoint");
})

app.get('/package/byRegEx/:regex', (req, res) => {
    res.send("package/byRegEx/" + req.params.regex + " endpoint");
})

app.get('/authenticate', (req, res) => {
    res.send("authenticate endpoint");
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, HTML_PATH + "/index.html"));
    // res.send("index!");
})

app.listen(port, () => {
    console.log("The application is listening on port " + port + "!");
})