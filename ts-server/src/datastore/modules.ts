import { Key } from '@google-cloud/datastore';

import {datastore, MODULE_KIND, NAMESPACE} from "./ds_config";
import { getKey, deleteEntity } from "/Users/maxim/Downloads/ECE461_Part2-main/ts-server/src/datastore";

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
function createRepoData(name?: string, version?: string, creation_date?: string, url?: string, readme?:string, packageAction?: any) {
    let data: {[key: string]: any} = {};
    if(name !== undefined)          data["name"]          = name;
    if(version !== undefined)       data["version"]       = version;
    if(url !== undefined)           data["url"]           = url;
    if(creation_date !== undefined) data["creation-date"] = creation_date
    if(readme !== undefined)        data["readme"]        = readme;
    if(packageAction !== undefined) data["packageAction"] = packageAction;
    return data;
}


function getModuleKey(id?: number): Key {
    return getKey(NAMESPACE, MODULE_KIND, id);
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
 * the id of the repo that was just added or
 * undefined if the repo could not be added.
 */
async function addRepo(repoData: {[key: string]: any}): Promise<string | undefined> {
    // call createRepoData to create the repoData to pass into this function
    const key = getModuleKey();

    const repo = {
        key: key,
        data: repoData
    };

    await datastore.save(repo);
    return key.id;
}


/**
 * Updates a repo
 *
 * @param repoID
 * @param newData
 */
async function updateRepo(repoID: number, newData: {[key: string]: any}): Promise<void> {
    // Get the datastore key for the repository ID
    const key = getModuleKey(repoID);
    // Get the entity associated with the datastore key
    const [entity] = await datastore.get(key);
    // Merge the new data with the existing data of the entity
    Object.assign(entity, newData);
    await datastore.save({
        key: key,
        data: entity
    });
}

/**
 * Updates the packageAction field of a package in the datastore for the given repository ID.
 *
 * @param {string} packageID - The ID of the repository whose package action is being updated.
 * @param {any} newPackageAction - The new package action (dictionary type) to be added to the package actions.
 */
 async function updateRepoPackageAction(packageID: string, newPackageAction: any): Promise<void> {
    // Get the datastore key for the repository ID
    const key = getModuleKey(Number(packageID));
    // Get the entity associated with the datastore key
    const [entity] = await datastore.get(key);
    // Get the existing package actions or create an empty array (in case the packageAction field is undefined or null)
    const packageActions = entity.packageAction || [];
    // Append the new package action to the existing package actions
    packageActions.push(newPackageAction);
    // Update the packageAction field of the entity with the new package actions
    entity.packageAction = packageActions;
    await datastore.save({
        key: key,
        data: entity
    });
}


/**
 *
 * @param PackageQuery
 * Array of Json objects with 2 key value pairs:
 *      Name:       string
 *      version:    string
 *
 * @param package_count
 * The number of packages per page
 *
 * @param offset
 * The offset in the list of packages found
 * start index = offset * package_count
 * end index = (offset + 1) * package_count - 1
 *
 * @example
 * if offset = 1 and package_count = 10
 * and the number of packages found from the PackageQuery is 20:
 * This function will return the packages at indices 10 to 19
 *
 * @return
 * This function returns a list of packages as json objects
 */
async function searchRepos(PackageQuery: Object, package_count: number, offset: number) {
    console.log("Unimplemented function 'searchRepos' from './src/datastore/modules.ts' was called.");
    // create query object
    let query = datastore.createQuery(NAMESPACE, MODULE_KIND)
        .filter("name", "in", )
        .filter("version");
    // add all filters to query object

    // set limit

    // loop thru results offset number of times
    for (let i =0; i < offset; i++) {

    }
    // return the last list of results
}
async function findReposByName(name: string) {
    const query = datastore
        .createQuery(NAMESPACE, MODULE_KIND)
        .filter('name', '=', name);

    const results = await datastore.runQuery(query);
    return results[0];
}



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
async function findReposByNameAndVersion(name: string, version: string) {
    // get version type using regex (exact[1.2.3], bounded[1.2.3-2.1.0], Carat[^1.2.3], Tilde[~1.2.0])

    if (version.search(/^[~|^]?\d+\.\d+\.\d+$/) == 0) { // exact,carat,tilde
        const query = datastore
            .createQuery(NAMESPACE, MODULE_KIND)
            .filter('name', '=', name)
            .filter('version', '=', version);
        return (await datastore.runQuery(query))[0];

    } else if(version.search(/^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/) == 0) { // bounded
        // can there be bounds with carat or tilde versions?
        let range = version.split("-");
        const query = datastore
            .createQuery(NAMESPACE, MODULE_KIND)
            .filter("name", "=", name)
            .filter("version", ">=", range[0])
            .filter("version", "<=", range[1]);
        return (await datastore.runQuery(query))[0];
    } else { // version invalid
        console.log("invalid version");
        return ["invalid version"];
    }
}


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
async function getAllReposPagenated(reposPerPage: number, endCursor?: string) {
    let query = datastore.createQuery(NAMESPACE, MODULE_KIND)
        .limit(reposPerPage);
    if (endCursor) {
        query = query.start(endCursor);
    }
    return await datastore.runQuery(query);
}

/**
 * Retrieves all repositories from the datastore in one call.
 *
 * @return A promise that resolves to a list of all repositories.
 */
async function getAllRepos() {
    const query = datastore.createQuery(NAMESPACE, MODULE_KIND);
    const [repositories] = await datastore.runQuery(query);
    return repositories;
}

/**
 *
 * @param repoID
 * uuid of module to delete
 *
 * @return
 * List of packages which were deleted due to this command or list containing
 * undefined if no package was deleted.
 */
async function deleteRepo(repoID: number): Promise<[{[key: string]: any}]> {
    return await deleteEntity(MODULE_KIND, repoID);
}


// functions to be used by the API endpoints
export { createRepoData, addRepo, getModuleKey,
    updateRepo, deleteRepo,
    searchRepos, findReposByName,
    findReposByNameAndVersion, getAllReposPagenated, getAllRepos, updateRepoPackageAction};
