import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

import { datastore, NAMESPACE, USER_KIND } from "./ds_config";
import {createSecretKey} from "crypto";

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
    const userInfo = await findUserByName(username);
    if (userInfo.length === 1) {
        // user exists
        // get the hashed password from datastore and compare it with the password from the request
        let realHashedPassword = userInfo[0].password;
        let match = await bcrypt.compare(password, realHashedPassword);
        if(match) {
            // create auth token for user and replace the old one
            let secretKey = await accessSecret();
            if (secretKey === undefined) {
                console.log("failed to get secret key");
                return "";
            }
            let authToken = jwt.sign({userId: userInfo.name }, secretKey);
            console.log(authToken);
            return authToken;
        } else {
            return "";
        }
    } else {
        //user dne
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

// functions to be used by the API endpoints
export { addUser , findUserByName, userLogin };