"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRegistration = void 0;
const functions = require("firebase-functions");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.cancelRegistration = functions.https.onCall(async (request) => {
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { registrationId } = request.data;
    if (!registrationId) {
        throw new functions.https.HttpsError("invalid-argument", "Registration ID required");
    }
    const regDoc = await admin_1.db.collection("registrations").doc(registrationId).get();
    if (!regDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Registration not found");
    }
    const regData = regDoc.data();
    if (regData.userId !== auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Can only cancel your own registration");
    }
    await admin_1.db.runTransaction(async (transaction) => {
        const eventRef = admin_1.db.collection("events").doc(regData.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists) {
            transaction.update(eventRef, {
                ticketsRemaining: eventSnap.data().ticketsRemaining + 1,
            });
        }
        transaction.update(admin_1.db.collection("registrations").doc(registrationId), {
            status: "cancelled",
        });
    });
    return { success: true };
});
//# sourceMappingURL=cancelRegistration.js.map