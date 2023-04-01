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
exports.doesIdExistInKind = exports.resetKind = exports.deleteEntity = exports.getKey = void 0;
const ds_config_1 = require("./ds_config");
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
function getKey(namespace, kind, id) {
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
exports.getKey = getKey;
/**
 * Checks if the given id exists in the given kind
 *
 * @param kind
 * @param id
 *
 * @return
 * Returns true if the id exists, false if not.
 */
function doesIdExistInKind(kind, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = getKey(ds_config_1.NAMESPACE, kind, id);
        const [entity] = yield ds_config_1.datastore.get(key);
        return entity !== undefined;
    });
}
exports.doesIdExistInKind = doesIdExistInKind;
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
function deleteEntity(kind, entityID) {
    return __awaiter(this, void 0, void 0, function* () {
        let key = getKey(ds_config_1.NAMESPACE, kind, entityID);
        let entity = ds_config_1.datastore.get(key);
        yield ds_config_1.datastore.delete(key);
        return entity;
    });
}
exports.deleteEntity = deleteEntity;
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
function resetKind(kind) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = ds_config_1.datastore.createQuery(ds_config_1.NAMESPACE, kind);
        const [entities] = yield ds_config_1.datastore.runQuery(query);
        console.log(entities);
        const keys = entities.map((entity) => entity[ds_config_1.datastore.KEY]);
        yield ds_config_1.datastore.delete(keys);
    });
}
exports.resetKind = resetKind;
