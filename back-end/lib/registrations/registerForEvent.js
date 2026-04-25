"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerForEvent = void 0;
const functions = require("firebase-functions");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.registerForEvent = functions.https.onCall(async (request) => {
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { eventId } = request.data;
    if (!eventId) {
        throw new functions.https.HttpsError("invalid-argument", "Event ID required");
    }
    const userDoc = await admin_1.db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
    }
    const existingReg = await admin_1.db
        .collection("registrations")
        .where("userId", "==", auth.uid)
        .where("eventId", "==", eventId)
        .where("status", "==", "confirmed")
        .get();
    if (!existingReg.empty) {
        throw new functions.https.HttpsError("already-exists", "Already registered for this event");
    }
    return admin_1.db.runTransaction(async (transaction) => {
        var _a;
        const eventRef = admin_1.db.collection("events").doc(eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Event not found");
        }
        const eventData = eventSnap.data();
        if (eventData.ticketsRemaining <= 0) {
            throw new functions.https.HttpsError("resource-exhausted", "No tickets remaining");
        }
        transaction.update(eventRef, {
            ticketsRemaining: eventData.ticketsRemaining - 1,
        });
        const regRef = admin_1.db.collection("registrations").doc();
        transaction.set(regRef, {
            userId: auth.uid,
            userName: ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "",
            eventId,
            eventTitle: eventData.title,
            registeredAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
            status: "confirmed",
        });
        return { registrationId: regRef.id };
    });
});
//# sourceMappingURL=registerForEvent.js.map