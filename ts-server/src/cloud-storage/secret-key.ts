import {storage, SECRET_STORAGE_BUCKET} from "./cs_config"

/** secret files: */
const JWT_AUTH_SECRET = "jwt_auth.txt";

/**
 * Use this function to get a secret from the secret bucket
 * in cloud storage. The secrets must be in their own file
 * and if you want to add your own secret, you must manually
 * create the secret file yourself, then create a constant
 * string like the one(s) above which contains the name of
 * the file which contains that secret
 *
 * @param secret - the secret you would like to get.
 *                 Must be one of the secret files listed
 *                 above.
 *
 * @example
 * // returns the secret key for jwt auth token hashing
 * await getSecret(JWT_AUTH_SECRET);
 *
 * @return
 * the contents of the secret file.
 */
async function getSecret(secret: String): Promise<String> {
    const bucket = await storage.bucket(SECRET_STORAGE_BUCKET);
    const file = await bucket.file(secret);
    const data = await file.download();
    return data[0].toString();
}


export { getSecret, JWT_AUTH_SECRET };