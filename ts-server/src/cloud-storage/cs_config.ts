const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
    // projectId: "npm-module-registry-381816"
});

const MODULE_STORAGE_BUCKET = "ece461-repositories";

export { storage, MODULE_STORAGE_BUCKET };