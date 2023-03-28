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
exports.addUser = void 0;
const ds_config_1 = require("./ds_config");
function addUser(name, hashedPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const ds_key = ds_config_1.datastore.key({
            namespace: ds_config_1.NAMESPACE,
            path: [ds_config_1.USER_KIND]
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
        yield ds_config_1.datastore.save(user);
    });
}
exports.addUser = addUser;
