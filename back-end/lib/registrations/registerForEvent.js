"use strict"; 
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerForEvent = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.registerForEvent = (0, https_1.onCall)(async (request) => {
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { eventId, venueId, venueName, venueAddress } = request.data;
    if (!eventId) {
        throw new https_1.HttpsError("invalid-argument", "Event ID required");
    }
    const userDoc = await admin_1.db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User not found");
    }
    return admin_1.db.runTransaction(async (transaction) => {
        var _a;
        const eventRef = admin_1.db.collection("events").doc(eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists) {
            throw new https_1.HttpsError("not-found", "Event not found");
        }
        const eventData = eventSnap.data();
        if (venueId && Array.isArray(eventData.venues)) {
            const venues = [...eventData.venues];
            const idx = venues.findIndex((v) => v.id === venueId);
            if (idx === -1) {
                throw new https_1.HttpsError("not-found", "Venue not found on event");
            }
            if (venues[idx].ticketsRemaining <= 0) {
                throw new https_1.HttpsError("resource-exhausted", "No tickets left for this venue");
            }
            venues[idx] = {
                ...venues[idx],
                ticketsRemaining: venues[idx].ticketsRemaining - 1,
            };
            const totalRemaining = venues.reduce((s, v) => s + v.ticketsRemaining, 0);
            transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining });
        }
        else {
            // Single-venue event
            if (eventData.ticketsRemaining <= 0) {
                throw new https_1.HttpsError("resource-exhausted", "No tickets remaining");
            }
            transaction.update(eventRef, {
                ticketsRemaining: eventData.ticketsRemaining - 1,
            });
        }
        const regRef = admin_1.db.collection("registrations").doc();
        const regDoc = {
            userId: auth.uid,
            userName: ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "",
            eventId,
            eventTitle: eventData.title,
            registeredAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
            status: "confirmed",
        };
        if (venueId)
            regDoc.venueId = venueId;
        if (venueName)
            regDoc.venueName = venueName;
        if (venueAddress)
            regDoc.venueAddress = venueAddress;
        transaction.set(regRef, regDoc);
        return { registrationId: regRef.id };
    });
});
