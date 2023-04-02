// stores variables used by functions that modify our datastore

const {Datastore} = require("@google-cloud/datastore");

// const projectId = process.env.PROJECT_ID;


const datastore = new Datastore();


const NAMESPACE = "ece461";

const MODULE_KIND = "modules";
const USER_KIND = "users";


export { datastore, NAMESPACE, MODULE_KIND, USER_KIND };