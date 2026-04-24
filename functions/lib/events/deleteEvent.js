"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = void 0;
const functions = require("firebase-functions");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.deleteEvent = functions.https.onCall(async (request) => {
    var _a;
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { eventId } = request.data;
    if (!eventId) {
        throw new functions.https.HttpsError("invalid-argument", "Event ID required");
    }
    const eventDoc = await admin_1.db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Event not found");
    }
    if (((_a = eventDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy) !== auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the event creator can delete");
    }
    const registrations = await admin_1.db
        .collection("registrations")
        .where("eventId", "==", eventId)
        .where("status", "==", "confirmed")
        .get();
    const batch = admin_1.db.batch();
    registrations.docs.forEach((doc) => {
        batch.update(doc.ref, { status: "cancelled" });
    });
    batch.delete(admin_1.db.collection("events").doc(eventId));
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=deleteEvent.js.map