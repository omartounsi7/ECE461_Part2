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

// functions to be used by the API endpoints
export { addUser };