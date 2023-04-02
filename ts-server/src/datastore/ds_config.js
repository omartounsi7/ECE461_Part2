"use strict";
// stores variables used by functions that modify our datastore
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_KIND = exports.MODULE_KIND = exports.NAMESPACE = exports.datastore = void 0;
const { Datastore } = require("@google-cloud/datastore");
// const projectId = process.env.PROJECT_ID;
const datastore = new Datastore();
exports.datastore = datastore;
const NAMESPACE = "ece461";
exports.NAMESPACE = NAMESPACE;
const MODULE_KIND = "modules";
exports.MODULE_KIND = MODULE_KIND;
const USER_KIND = "users";
exports.USER_KIND = USER_KIND;
