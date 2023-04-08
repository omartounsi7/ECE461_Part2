import { datastore, NAMESPACE, USER_KIND } from "./ds_config";

async function addUser(name: string, hashedPassword: string) {
    const ds_key = datastore.key({
        namespace: NAMESPACE,
        path: [USER_KIND]
    });

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

// functions to be used by the API endpoints
export { addUser , findUserByName};