"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = void 0;
const functions = require("firebase-functions");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.createEvent = functions.https.onCall(async (request) => {
    var _a;
    const auth = (0, auth_1.requireAuth)(request.auth);
    const userDoc = await (0, auth_1.requireOrganizer)(auth.uid);
    const data = request.data;
    if (!data.title || !data.description) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    const venues = Array.isArray(data.venues) && data.venues.length > 0
        ? data.venues
        : undefined;
    // Multi-venue: capacity is the sum of each venue's capacity.
    // Single-venue: caller passes a top-level ticketLimit.
    const totalLimit = venues
        ? venues.reduce((sum, v) => sum + Number(v.ticketLimit || 0), 0)
        : Number(data.ticketLimit);
    if (!totalLimit || totalLimit < 1 || totalLimit > 100000) {
        throw new functions.https.HttpsError("invalid-argument", "Total ticket capacity must be between 1 and 100000");
    }
    const primaryDate = venues
        ? new Date(venues[0].dateTime)
        : new Date(data.dateTime);
    const primaryLocation = venues ? venues[0].address : data.location;
    if (!primaryLocation) {
        throw new functions.https.HttpsError("invalid-argument", "Location required");
    }
    const event = {
        title: data.title,
        description: data.description,
        location: primaryLocation,
        dateTime: admin_1.admin.firestore.Timestamp.fromDate(primaryDate),
        ticketLimit: totalLimit,
        ticketsRemaining: totalLimit,
        createdBy: auth.uid,
        createdByName: ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "",
        flyerURL: data.flyerURL || "",
        category: data.category || "General",
        createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
    };
    if (venues) {
        event.venues = venues.map((v) => ({
            id: v.id,
            name: v.name,
            address: v.address,
            dateTime: admin_1.admin.firestore.Timestamp.fromDate(new Date(v.dateTime)),
            ticketLimit: Number(v.ticketLimit),
            ticketsRemaining: Number(v.ticketLimit),
        }));
    }
    const docRef = await admin_1.db.collection("events").add(event);
    return { eventId: docRef.id };
});
//# sourceMappingURL=createEvent.js.map