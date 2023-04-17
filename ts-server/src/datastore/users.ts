import bcrypt, {compare} from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

import {datastore, MODULE_KIND, NAMESPACE, USER_KIND} from "./ds_config";
import {createSecretKey} from "crypto";
import {getModuleKey} from "./modules";
import {Key} from "@google-cloud/datastore";
import {getKey, getUserKey, deleteEntity} from "./datastore";


/**
 * Creates data for a user.
 * @return
 * Returns user data which can be passed in to other
 * functions to update or create a user in gcp datastore.
 */

function getUser1Key(id?: number): Key {
    return getUserKey(NAMESPACE, USER_KIND, id);
}

async function addUser(name: string, password: string, is_admin: boolean) {
    // hash password here!
    let hashedPassword = await bcrypt.hash(password, 3);
    const user = {
        key: getUser1Key(),
        data: [
            {
                name: "name",
                value: name
            },
            {
                name: "password",
                value: hashedPassword,
                excludeFromIndexes: true
            },
            {
                name: "is_admin",
                value: is_admin
            },
            {
                name: "api_counter",
                value: 1000
            }
        ]
    };

    await datastore.save(user)
    console.log(getUser1Key())
    return getUser1Key();
}

// removes/deletes user from our user database
async function deleteUser(repoID: number): Promise<[{[key: string]: any}]> {
    return await deleteEntity(USER_KIND, repoID);
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
            // Checks if user already has a JWT authentication token in the database
            //if (userInfo.authToken) {
            //    return userInfo.authToken;
            // }
            // create auth token for user and replace the old one
            let secretKey = "apple"; //await accessSecret();
            if (secretKey === undefined) {
                console.log("failed to get secret key");
                return "";
            }
            console.log(userInfo.name)
            console.log(userInfo.is_admin)
            console.log(Number(userKey.id))

            const payload = {
                "name": userInfo.name,
                "admin": userInfo.is_admin,
                "id": Number(userKey.id)
              };
            
            // JWT TOKEN WILL EXPIRE IN 10 HOURS
            let authToken = jwt.sign(payload, secretKey,  { expiresIn: '10h' });
            // store auth token in datastore
            await createAuthToken(Number(userKey.id), authToken);
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

async function createAuthToken(id: number, authToken: string) {
    // Get the datastore key for the repository ID
    const key = getUser1Key(id);
    // Get the entity associated with the datastore key
    const [entity] = await datastore.get(key);
    console.log(entity)
    // Merge the new data with the existing data of the entity
    Object.assign(entity, {authToken: authToken});
    await datastore.save({
        key: key,
        data: entity
    });

}

async function updateApiCounter(userId: number): Promise<boolean> {
    // Get the datastore key for the user ID
    const key = getUser1Key(userId);
    // Get the user entity from the Datastore
    const [user] = await datastore.get(key);
    
    // Get the existing api counter value
    const api_count = user["api_counter"];
    const newApiCounter = api_count - 1;

    // Update the api_counter field of the entity with the new count
    user["api_counter"] = newApiCounter;

    // Update the apiCounter field for the user entity with the new value
    await datastore.save({
      key: key,
      data: user,
    });
  
    // Return a boolean indicating whether the apiCounter value is negative or not
    return newApiCounter < 0;
}


// functions to be used by the API endpoints
export { addUser , findUserByName, userLogin, accessSecret, updateApiCounter, deleteUser};