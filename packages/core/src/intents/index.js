"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomEvent = exports.allEventsToIntent = void 0;
var events_1 = require("./events");
var eventsToIntent_1 = require("./eventsToIntent");
Object.defineProperty(exports, "allEventsToIntent", { enumerable: true, get: function () { return eventsToIntent_1.allEventsToIntent; } });
var isCustomEvent = function (event) {
    return events_1.allCustomEvents.includes(event);
};
exports.isCustomEvent = isCustomEvent;
