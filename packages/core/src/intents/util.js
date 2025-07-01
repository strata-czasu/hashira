"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventsToIntent = void 0;
var createEventsToIntent = function (events, intents) {
    return Object.fromEntries(events.map(function (event) { return [event, intents]; }));
};
exports.createEventsToIntent = createEventsToIntent;
