import { storage } from "./cs_config"
import { createWriteStream } from "fs";
import e from "express";


// FILETYPES
const ZIP_FILETYPE = "zip";
const TXT_FILETYPE = "txt";

/**
 * gets the contents of the specified module from cloud storage as base64
 * @param moduleName - name of the module
 * @param version    - version of the module
 * @param filetype   - one of the filetypes defined at the top of *cloud-storage.ts*
 * @param bucket     - destination bucket
 *
 * @example
 * // gets the contents of "module_1_0_0.zip" from the directory "module/"
 * // which is contained in the bucket "bucketName"
 * getModuleAsBase64FromCloudStorage("module", "version", ZIP_FILETYPE, "bucketName");
 */
async function getModuleFromCloudStorage(moduleName: string, version: string, filetype: string, bucket: string): Promise<string> {
    const path = cloudStorageFilePathBuilder(moduleName + "." + filetype, version);

    if (filetype === TXT_FILETYPE) {
        return await getCloudStoragefileAsUTF8(path, bucket);
    }
    else {
        return await getCloudStoragefileAsBase64(path, bucket);
    }
}

/**
 * uploads the specified module to cloud storage
 * @param moduleName     - name of the module
 * @param version        - version of the module
 * @param filetype       - one of the filetypes defined at the top of *cloud-storage.ts*
 * @param base64Contents - base64 contents of the file to upload
 * @param bucket         - destination bucket
 *
 * @example
 * // uploads the file "module_1_0_0.zip" to the directory "module/" which will
 * // contain the content "aGVsbG8gd29ybGQ=" and will be located in the bucket "bucketName"
 * uploadModuleToCloudStorage("module", "1.0.0", ZIP_FILETYPE, "aGVsbG8gd29ybGQ=", "bucketName");
 */
async function uploadModuleToCloudStorage(moduleName: string, version: string, filetype: string, base64Contents: string, bucket: string): Promise<void> {
    const path = cloudStorageFilePathBuilder(moduleName + "." + filetype, version);
    return await uploadBase64FileToCloudStorage(path, base64Contents, filetype, bucket);
}
/**
 * Deletes the specified module from gcp cloud storage
 * @param moduleName - name of the module
 * @param version    - version of the module
 * @param filetype   - one of the filetypes defined at the top of *cloud-storage.ts*
 * @param bucket     - bucket containing the module
 *
 * @example
 * deletes the file "module_1_0_0.zip"  from the directory "module/"
 * which is located in the bucket "buckeName"
 * deleteModuleFromCloudStorage("module/module_1_0_0.zip", "bucketName");
 */

async function deleteModuleFromCloudStorage(cloudStorageFile: string, bucket: string): Promise<void> {
    return await storage.bucket(bucket).file(cloudStorageFile).delete();
}

/**
 * Deletes all modules located in the specified module
 * @param bucket - bucket to delete all modules from
 */
async function resetCloudStorage(bucket: string) {
    const [files] = await storage.bucket(bucket).getFiles();
    await Promise.all(files.map((file: any) => {
        if (file.name.endsWith("/")) {
            return file.delete({ force: true });
        } else {
            return file.delete();
        }
    }))
}

/**
 * Builds the filepath for a module to be stored in gcp cloud storage.
 * This function assumes that the given filepath is valid and the
 * version is in the <a href="semver.org">Semantic Versioning format</a>
 *
 * @param moduleName
 * the name of the module you want to store
 * @param version
 * the version of the module you want to store
 *
 * @example
 * cloudStorageFilePathBuilder("module.zip", "1.0.0");
 * returns "module/module_1_0_0.zip"
 * @example
 * cloudStorageFilePathBuilder("module", "1.0.0");
 * returns "module/module_1_0_0"
 * @example
 * cloudStorageFilePathBuilder("module.zip", "~1.0.0");
 * returns "module/module_tilde1_0_0.zip"
 * @example
 * cloudStorageFilePathBuilder("module.zip", "^1.0.0");
 * returns "module/module_carat1_0_0.zip"
 * @example
 * cloudStorageFilePathBuilder("module.zip", "1.0.0-alpha");
 * returns "module/module_1_0_0-alpha.zip"
 *
 * @return
 * the filepath for the module to be stored in cloud storage
 */
function cloudStorageFilePathBuilder(moduleName: string, version: string): string {
    // prepare module name and version
    let splitName = moduleName.split(".");
    version = version.replace("^", "carat")
            .replace("~", "tilde")
            .replace(/\./g, "_");

    let cloudFilePath: string
    // create path
    if (splitName[1] === ZIP_FILETYPE) {
        cloudFilePath = "module/" + splitName[0] + "_" + version;
        // add file extension if it exists
        if (splitName.length === 2) cloudFilePath += "." + splitName[1];
        return cloudFilePath;
    } else {
        cloudFilePath = "readme/" + splitName[0] + "_" + version;
        // add file extension if it exists
        if (splitName.length === 2) cloudFilePath += "." + splitName[1];
        return cloudFilePath;
    }
}


/**
 * uploads a file as base64 to gcp cloud storage
 * @param destCloudPath
 * @param base64Contents
 * @param bucket
 *
 * @example
 * uploadBase64FileToCloudStorage("file-on-cloud-storage.txt", fileToBase64("file-on-local-device.txt"), MODULE_STORAGE_BUCKET);
 * the fileToBase64 function is from ../utils.ts
 * MODULE_STORAGE_BUCKET is from ./cs_config.ts
 */
async function uploadBase64FileToCloudStorage(destCloudPath: string, base64Contents: string, filetype: string, bucket: string): Promise<void> {
    
    if (filetype === TXT_FILETYPE){
        const contentType2 = "text/plain";
        const contentEncoding2 = "utf8";

        const fileContents = Buffer.from(base64Contents, contentEncoding2);

        const file = storage.bucket(bucket).file(destCloudPath);
        return await file.save(fileContents, {
            contentType2,
            contentEncoding2
        })
    } else {
        const contentEncoding = "base64";
        const contentType = "application/octet-stream";

        const fileContents = Buffer.from(base64Contents, contentEncoding);

        const file = storage.bucket(bucket).file(destCloudPath);
        return await file.save(fileContents, {
            contentType,
            contentEncoding
        })
    }
    
}


/**
 * Gets a cloud storage file as a base64 string.
 * @param srcCloudPath
 * @param bucket
 *
 * @return
 * the contents of the file in **srcCloudPath** as a base64 string
 */
async function getCloudStoragefileAsBase64(srcCloudPath: string, bucket: string): Promise<string> {
    const file = storage.bucket(bucket).file(srcCloudPath);
    const [fileContents] = await file.download();

    return fileContents.toString("base64");
}


/**
 * Gets a cloud storage file as a UTF-8 string.
 * @param srcCloudPath
 * @param bucket
 *
 * @return
 * the contents of the file in **srcCloudPath** as a UTF-8 string
 */
 async function getCloudStoragefileAsUTF8(srcCloudPath: string, bucket: string): Promise<string> {
    const file = storage.bucket(bucket).file(srcCloudPath);
    const [fileContents] = await file.download();

    return fileContents.toString("utf-8");
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Functions used for testing GCP Cloud Storage functionality  *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/**
 * Uploads a file given its filepath to gcp cloud storage
 * @param srcFilePath
 * @param destCloudPath
 * @param bucket
 */
async function uploadFileToCloudStorage(srcFilePath: string, destCloudPath: string, bucket: string) {
    return await storage.bucket(bucket).upload(srcFilePath, {
        destination: destCloudPath,
    });
}

/**
 * Downloads a file from gcp cloud storage and stores it on the local
 * machine at the destination path
 * @param srcCloudPath
 * @param destFilePath
 * @param bucket
 */
async function downloadFileFromCloudStorage(srcCloudPath: string, destFilePath: string, bucket: string) {
    const srcFile = storage.bucket(bucket).file(srcCloudPath);
    return await srcFile.createReadStream().pipe(createWriteStream(destFilePath));
}

export { getModuleFromCloudStorage, uploadBase64FileToCloudStorage, getCloudStoragefileAsUTF8, cloudStorageFilePathBuilder, uploadModuleToCloudStorage, deleteModuleFromCloudStorage, resetCloudStorage, ZIP_FILETYPE, TXT_FILETYPE };