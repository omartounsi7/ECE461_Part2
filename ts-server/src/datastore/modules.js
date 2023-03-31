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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllReposPagenated = exports.findReposByNameAndVersion = exports.findReposByName = exports.searchRepos = exports.deleteRepo = exports.updateRepo = exports.addRepo = exports.createRepoData = void 0;
const ds_config_1 = require("./ds_config");
const datastore_1 = require("./datastore");
/* * * * * * * * * * *
 * Helper Functions  *
 * * * * * * * * * * */
/**
 * Creates data for a repo.
 *
 * @param name
 * @param creation_date
 * @param url
 * @param version
 *
 * @example
 * To create a repo data object which only contains
 * version and creation date:
 * createRepoData(undefined, "1.2.3", new Date().toJSON;
 *
 * @return
 * Returns repo data which can be passed in to other
 * functions to update or create a repo in gcp datastore.
 */
function createRepoData(name, version, creation_date, url) {
    let data = {};
    if (name !== undefined)
        data["name"] = name;
    if (version !== undefined)
        data["version"] = version;
    if (url !== undefined)
        data["url"] = url;
    if (creation_date !== undefined)
        data["creation-date"] = creation_date;
    return data;
}
exports.createRepoData = createRepoData;
function getModuleKey(id) {
    return (0, datastore_1.getKey)(ds_config_1.NAMESPACE, ds_config_1.MODULE_KIND, id);
}
/* * * * * * * * * * *
 * Module functions  *
 * * * * * * * * * * */
/**
 * Adds a repo to the repo kind
 *
 * @param repoData
 *
 * @return
 * returns the info of the repo that was just added
 */
function addRepo(repoData) {
    return __awaiter(this, void 0, void 0, function* () {
        // call createRepoData to create the repoData to pass into this function
        const key = getModuleKey();
        const repo = {
            key: key,
            data: repoData
        };
        yield ds_config_1.datastore.save(repo);
        console.log(key.id);
    });
}
exports.addRepo = addRepo;
/**
 * Updates a repo
 *
 * @param repoID
 * @param newData
 */
function updateRepo(repoID, newData) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = getModuleKey(repoID);
        const [entity] = yield ds_config_1.datastore.get(key);
        Object.assign(entity, newData);
        yield ds_config_1.datastore.save({
            key: key,
            data: entity
        });
    });
}
exports.updateRepo = updateRepo;
/**
 *
 * @param PackageQuery
 * Array of Json objects with 2 key value pairs:
 *      Name:       string
 *      version:    string
 *
 * @param package_count
 * The maximum number of packages to return
 *
 * @param offset
 * The offset in the list of packages found
 * start index = offset * package_count
 * end index = (offset + 1) * package_count - 1
 * Example:
 *      if offset = 1 and package_count = 10
 *      and the number of packages found from the PackageQuery is 20:
 *      This function will return the packages at indices 10 to 19
 *
 * @return
 * This function returns a list of packages as json objects
 */
function searchRepos(PackageQuery, package_count, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Unimplemented function 'searchRepos' from './src/datastore/modules.ts' was called.");
    });
}
exports.searchRepos = searchRepos;
function findReposByName(name) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.findReposByName = findReposByName;
/**
 *
 * @param name
 * The name to match in the datastore search
 * @param version
 * The version number(s) to match in the datastore search
 * examples:
 * exact:   '1.2.3'
 * bounded: '1.2.3-2.1.0'
 * carat:   '^1.2.3'
 * tilde:   '~1.2.0'
 *
 * @return
 * A list of repos that matched the search parameters
 */
function findReposByNameAndVersion(name, version) {
    return __awaiter(this, void 0, void 0, function* () {
        // get version type using regex (exact[1.2.3], bounded[1.2.3-2.1.0], Carat[^1.2.3], Tilde[~1.2.0])
        if (version.search(/^[~|^]?\d+\.\d+\.\d+$/) == 0) { // exact,carat,tilde
            const query = ds_config_1.datastore
                .createQuery(ds_config_1.NAMESPACE, ds_config_1.MODULE_KIND)
                .filter('name', '=', name)
                .filter('version', '=', version);
            return (yield ds_config_1.datastore.runQuery(query))[0];
        }
        else if (version.search(/^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/) == 0) { // bounded
            // can there be bounds with carat or tilde versions?
            let range = version.split("-");
            const query = ds_config_1.datastore
                .createQuery(ds_config_1.NAMESPACE, ds_config_1.MODULE_KIND)
                .filter("name", "=", name)
                .filter("version", ">=", range[0])
                .filter("version", "<=", range[1]);
            return (yield ds_config_1.datastore.runQuery(query))[0];
        }
        else { // version invalid
            console.log("invalid version");
            return ["invalid version"];
        }
    });
}
exports.findReposByNameAndVersion = findReposByNameAndVersion;
/**
 *
 * @param reposPerPage
 * The maximum number of repos to return
 * @param endCursor
 * If you've called this function before and want to continue from
 * the last repo returns, get the endCursor from the return value
 * and use it for this parameter
 *
 * @Return
 * returns a list of 2 json objects.
 * The first is a list of the requested repositories
 * The second is a json object containing the endCursor
 */
function getAllReposPagenated(reposPerPage, endCursor) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = ds_config_1.datastore.createQuery(ds_config_1.NAMESPACE, ds_config_1.MODULE_KIND)
            .limit(reposPerPage);
        if (endCursor) {
            query = query.start(endCursor);
        }
        return yield ds_config_1.datastore.runQuery(query);
    });
}
exports.getAllReposPagenated = getAllReposPagenated;
/**
 *
 * @param repoID
 * uuid of module to delete
 *
 * @return
 * This function returns a list of packages which were deleted due to this command
 */
function deleteRepo(repoID) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Unimplemented function 'deleteRepo' from './src/datastore/modules.ts' was called.");
    });
}
exports.deleteRepo = deleteRepo;
