import {promises as fs} from "fs";

/**
 * Converts a file to base64
 * @param srcFilePath
 *
 * @return
 * the file contents as a base64 string
 */
async function fileToBase64(srcFilePath: string): Promise<string> {
    const contents = await fs.readFile(srcFilePath);
    return contents.toString("base64");
}

/**
 * Write contents in base64 to a file on the local device.
 * @param destFilePath
 * @param base64Contents
 */
async function base64ToFile(destFilePath: string, base64Contents: string) : Promise<void> {
    const buffer = Buffer.from(base64Contents, "base64");
    await fs.writeFile(destFilePath, buffer);
}


export { fileToBase64, base64ToFile };