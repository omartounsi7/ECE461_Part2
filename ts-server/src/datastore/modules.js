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
exports.findRepo = exports.searchRepos = exports.deleteRepo = exports.updateRepo = exports.addRepo = void 0;
const ds_config_1 = require("./ds_config");
/* * * * * * * * * * *
 * Helper Functions  *
 * * * * * * * * * * */
function createRepoData(name, url, version) {
    return [
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
    ];
}
function getKey(id) {
    let path = [];
    if (typeof id === undefined) {
        path = [ds_config_1.MODULE_KIND];
    }
    else {
        path = [ds_config_1.MODULE_KIND, id];
    }
    return ds_config_1.datastore.key({
        namespace: ds_config_1.NAMESPACE,
        path: path
    });
}
/* * * * * * * * * * *
 * Module functions  *
 * * * * * * * * * * */
function addRepo(name, url, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const ds_key = getKey();
        const repo = {
            key: ds_key,
            data: createRepoData(name, url, version)
        };
        yield ds_config_1.datastore.save(repo);
    });
}
exports.addRepo = addRepo;
function updateRepo(repoID, newName) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = ds_config_1.datastore.transaction();
        const ds_key = getKey(repoID);
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
 * @Return
 * This function returns a list of packages as json objects
 */
function searchRepos(PackageQuery, package_count, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Unimplemented function 'searchRepos' from './src/datastore/modules.ts' was called.");
    });
}
exports.searchRepos = searchRepos;
// test function so I can figure out how to query stuff
function findRepo(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = ds_config_1.datastore
            .createQuery(ds_config_1.NAMESPACE, ds_config_1.MODULE_KIND)
            .filter("name", "=", name);
        // .order("priority");
        const [modules] = yield ds_config_1.datastore.runQuery(query);
        console.log("Modules:");
        modules.forEach((module) => console.log(module));
    });
}
exports.findRepo = findRepo;
/**
 *
 * @param repoID
 * uuid of module to delete
 *
 * @Return
 * This function returns a list of packages which were deleted due to this command
 */
function deleteRepo(repoID) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Unimplemented function 'deleteRepo' from './src/datastore/modules.ts' was called.");
    });
}
exports.deleteRepo = deleteRepo;
