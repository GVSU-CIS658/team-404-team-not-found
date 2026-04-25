"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRegistration = exports.registerForEvent = exports.deleteEvent = exports.updateEvent = exports.createEvent = void 0;
var createEvent_1 = require("./events/createEvent");
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return createEvent_1.createEvent; } });
var updateEvent_1 = require("./events/updateEvent");
Object.defineProperty(exports, "updateEvent", { enumerable: true, get: function () { return updateEvent_1.updateEvent; } });
var deleteEvent_1 = require("./events/deleteEvent");
Object.defineProperty(exports, "deleteEvent", { enumerable: true, get: function () { return deleteEvent_1.deleteEvent; } });
var registerForEvent_1 = require("./registrations/registerForEvent");
Object.defineProperty(exports, "registerForEvent", { enumerable: true, get: function () { return registerForEvent_1.registerForEvent; } });
var cancelRegistration_1 = require("./registrations/cancelRegistration");
Object.defineProperty(exports, "cancelRegistration", { enumerable: true, get: function () { return cancelRegistration_1.cancelRegistration; } });
//# sourceMappingURL=index.js.map