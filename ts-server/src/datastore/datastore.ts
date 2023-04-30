import { Key } from '@google-cloud/datastore';

import {datastore, MODULE_KIND, NAMESPACE, USER_KIND} from "./ds_config";

/**
 * Creates and returns a key object in the correct format for
 * GCP datastore.
 *
 * @param namespace
 * @param kind
 * @param id
 *
 * @return
 * The created key object
 */
function getKey(namespace: string, kind: string, id?:number): Key {
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


function getUserKey(namespace: string, kind: string, id?:number): Key {
    let path = [];
    if (typeof id === undefined) {
        path = [USER_KIND]
    } else {
        path = [USER_KIND, id];
    }
    return datastore.key({
        namespace: NAMESPACE,
        path: path
    });
}



/**
 * Checks if the given id exists in the given kind
 *
 * @param kind
 * @param id
 *
 * @return
 * Returns true if the id exists, false if not.
 */
async function doesIdExistInKind(kind: string, id: number): Promise<boolean> {
    const key = getKey(NAMESPACE, kind, id);

    const [entity] = await datastore.get(key);

    return entity !== undefined;
}


/**
 *
 * @param kind
 * The 'kind' the entity is located in
 * @param entityID
 * the ID of the entity
 *
 * @return
 * List of entities which were deleted due to this command or list containing
 * undefined if no entity was deleted.
 */
async function deleteEntity(kind: string, entityID: number) {
    let key;
    if (kind === "modules") {
        key = getKey(NAMESPACE, kind, entityID);
    } else {
        key = getUserKey(NAMESPACE, kind, entityID);
    }
    
    let entity = datastore.get(key);
    await datastore.delete(key);
    return entity;
}

/**
 * Resets the given kind by deleting all entities contained by it.
 *
 * @param kind
 * The kind to reset
 *
 * @return
 * Returns a list of json objects containing information about
 * each entity that was deleted.
 */
async function resetKind(kind: string) {
    const query = datastore.createQuery(NAMESPACE, kind);
    const [entities] = await datastore.runQuery(query);
    const keys = entities.map((entity: { [x: string]: any; }) => entity[datastore.KEY]);
    await datastore.delete(keys);
    return;
}

export { getKey, deleteEntity, getUserKey, resetKind, doesIdExistInKind };



