import { datastore, NAMESPACE, MODULE_KIND } from "./ds_config";


/* * * * * * * * * * *
 * Helper Functions  *
 * * * * * * * * * * */

function createRepoData(name: string, url: string, version: string) {
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
    ]
}

function getKey(id?:number) {
    let path = [];
    if (typeof id === undefined) {
        path = [MODULE_KIND]
    } else {
        path = [MODULE_KIND, id];
    }
    return datastore.key({
        namespace: NAMESPACE,
        path: path
    });
}


/* * * * * * * * * * *
 * Module functions  *
 * * * * * * * * * * */

async function addRepo(name: string, url: string, version: string) {
    const ds_key = getKey();

    const repo = {
        key: ds_key,
        data: createRepoData(name, url, version)
    };

    await datastore.save(repo);
}

async function updateRepo(repoID: number, newName: string) {
    const transaction = datastore.transaction();

    const ds_key = getKey(repoID);
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
async function searchRepos(PackageQuery: Object, package_count: number, offset: number) {
    console.log("Unimplemented function 'searchRepos' from './src/datastore/modules.ts' was called.");

}

// test function so I can figure out how to query stuff
async function findRepo(name: string) {
    // this works for querying on a single filter
    // const query = datastore
    //     .createQuery(NAMESPACE, MODULE_KIND)
    //     .filter("name", "=", name);
    //
    // const [modules] = await datastore.runQuery(query);
    // console.log("Modules:");
    // modules.forEach((module: any) => console.log(module));
    // --------------------------------------------------



}

/**
 *
 * @param repoID
 * uuid of module to delete
 *
 * @Return
 * This function returns a list of packages which were deleted due to this command
 */
async function deleteRepo(repoID: number) {
    console.log("Unimplemented function 'deleteRepo' from './src/datastore/modules.ts' was called.");

}

// functions to be used by the API endpoints
export { addRepo, updateRepo , deleteRepo, searchRepos, findRepo };