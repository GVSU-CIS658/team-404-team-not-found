"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireOrganizer = requireOrganizer;
const functions = require("firebase-functions");
const admin_1 = require("./admin");
function requireAuth(auth) {
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    return auth;
}
async function requireOrganizer(uid) {
    var _a;
    const userDoc = await admin_1.db.collection("users").doc(uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "organizer") {
        throw new functions.https.HttpsError("permission-denied", "Only organizers can perform this action");
    }
    return userDoc;
}
//# sourceMappingURL=auth.js.map