"use strict";
// Courtesy of https://github.com/Glitchii/embedbuilder
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeJson = exports.decodeJson = void 0;
var decodeJson = function (json) {
    var jsonData = decodeURIComponent(json);
    try {
        return JSON.parse(decodeURIComponent(atob(jsonData)));
    }
    catch (_a) {
        return null;
    }
};
exports.decodeJson = decodeJson;
var encodeJson = function (json) {
    var data = JSON.stringify(json);
    var url = new URL("https://glitchii.github.io/embedbuilder/");
    // Remove any padding from the base64 encoding
    var dataParam = btoa(encodeURIComponent(data)).replace(/=*$/, "");
    url.searchParams.set("data", dataParam);
    return url.toString();
};
exports.encodeJson = encodeJson;
