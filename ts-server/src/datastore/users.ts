import bcrypt, {compare} from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

import {datastore, MODULE_KIND, NAMESPACE, USER_KIND} from "./ds_config";
import {createSecretKey} from "crypto";
import {getModuleKey} from "./modules";
import {Key} from "@google-cloud/datastore";
import {getKey} from "./datastore";


function getUserKey(id?: number): Key {
    return getKey(NAMESPACE, USER_KIND, id);
}

async function addUser(name: string, password: string) {
    const ds_key = datastore.key({
        namespace: NAMESPACE,
        path: [USER_KIND]
    });

    // hash password here!
    let hashedPassword = await bcrypt.hash(password, 1);

    const user = {
        key: ds_key,
        data: [
            {
                name: "name",
                value: name
            },
            {
                name: "password",
                value: hashedPassword,
                excludeFromIndexes: true
            }
        ]
    };

    await datastore.save(user);
}

async function findUserByName(name: string) {
    const query = datastore
        .createQuery(NAMESPACE, USER_KIND)
        .filter('name', '=', name);

    const results = await datastore.runQuery(query);
    return results[0];
}

async function userLogin(username: string, password: string): Promise<string> {
    const userInfoL: any[] = await findUserByName(username);
    if (userInfoL.length === 1) {
        const userInfo = userInfoL[0];
        const userKey = userInfo[datastore.KEY];
        // user exists
        // get the hashed password from datastore and compare it with the password from the request
        let realHashedPassword = userInfo.password;
        let match = await bcrypt.compare(password, realHashedPassword);
        if(match) {
            // create auth token for user and replace the old one
            let secretKey = await accessSecret();
            if (secretKey === undefined) {
                console.log("failed to get secret key");
                return "";
            }
            let authToken = jwt.sign({userId: userInfo.name }, secretKey);
            // store auth token in datastore
            await updateAuthToken(Number(userKey.id), authToken);
            return authToken;
        } else {
            console.log("incorrect password");
            return "";
        }
    } else {
        //user dne
        console.log("user does not exist");
        return "";
    }
}

async function accessSecret() {
    const client = new SecretManagerServiceClient();

    const name = 'projects/120511363295/secrets/SECRET_KEY/versions/1';

    const [version] = await client.accessSecretVersion({ name });
    if(version.payload === undefined || version.payload === null) {
        console.log("failed to get version.payload in accessSecret.");
        return "";
    }
    if(version.payload.data === undefined || version.payload.data === null) {
        console.log("failed to get version.payload.data in accessSecret");
        return "";
    }
    const token = version.payload.data.toString();

    return token;
}

async function updateAuthToken(id: number, authToken: string) {
    // Get the datastore key for the repository ID
    let key = getUserKey(id);
    // Get the entity associated with the datastore key
    const [entity] = await datastore.get(key);
    // Merge the new data with the existing data of the entity
    Object.assign(entity, {authToken: authToken});
    await datastore.save({
        key: key,
        data: entity
    });
}

// functions to be used by the API endpoints
export { addUser , findUserByName, userLogin };