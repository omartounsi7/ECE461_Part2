import {LOG_STORAGE_BUCKET, storage} from "./cs_config"

const LOGGER_NAME_PREFIX = "log";

/**
 * logs a nodejs request object.
 *
 * **IMPORTANT:**
 * Make sure to call this function at the beginning of the endpoint handling function
 * So the request will get logged regardless of any errors that the endpoint generates.
 *
 * @param requestType
 * @param endpoint
 * @param req
 *
 * @example
 *
 * /// SNIPPET EXAMPLES:
 *
 * // log requests in the authentication endpoint
 * await logRequest("put", "/authenticate", req);
 *
 * // log requests in the GET packet by id endpoint
 * await logRequest("get", "/package/:id", req);
 *
 * /// FULL EXAMPLE:
 *
 * // log requests to a PUT example endpoint
 * app.put('/example', async (req, res) => {
 *     await logRequest("put", "/example", req);
 * });
 */
async function logRequest(requestType: string, endpoint: string, req: any) {
    await writeToLog(`${requestType.toUpperCase()} ${endpoint} endpoint called:\n    Headers: ${req.headers === undefined ? "[empty]" : `\n    ${JSON.stringify(req.headers)}`}\n    Body: ${req.body === undefined ? "[empty]" : `\n    ${JSON.stringify(req.body)}`}`);
}

async function writeToLog(log: any) {
    const contentType = "application/octet-stream";
    const contentEncoding = "text/plain";

    const fileName = getLogFileName();
    const bucket = await storage.bucket(LOG_STORAGE_BUCKET);
    const file = await bucket.file(fileName);
    const [exists] = await file.exists();
    let contents: Buffer;
    if(exists) {

        contents = Buffer.from((await file.download())[0] + `\n[${get24hourTime()}]: ` + log);
        // contents = await file.download();
        // await file.save(contents[0].toString() + `\n[${get24hourTime()}]: ` + log);
    } else {
        contents = Buffer.from(`[${get24hourTime()}]: ` + log);
        // await file.save(`\n[${get24hourTime()}]: ` + log);
    }
    file.save(contents, {
        contentType,
        contentEncoding
    });
}

function get24hourTime() {
    // const now = new Date();
    // const hours = now.getHours();
    // const minutes = now.getMinutes();
    // const seconds = now.getSeconds();
    // return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const currentDate = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/New_York',
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };
    return currentDate.toLocaleString('en-US', options);
}

function getLogFileName() {
    // get date and append to log name prefix
    const date = new Date();
    return `${LOGGER_NAME_PREFIX}_${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}.log`;
}


export { writeToLog, logRequest };