"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEvent = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
const ALLOWED_FIELDS = new Set([
    "title",
    "description",
    "location",
    "dateTime",
    "ticketLimit",
    "category",
    "flyerURL",
    "venues",
]);
exports.updateEvent = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { eventId, updates } = request.data || {};
    if (!eventId || typeof updates !== "object") {
        throw new https_1.HttpsError("invalid-argument", "eventId and updates required");
    }
    const eventRef = admin_1.db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
        throw new https_1.HttpsError("not-found", "Event not found");
    }
    if (((_a = eventSnap.data()) === null || _a === void 0 ? void 0 : _a.createdBy) !== auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Only the event creator can edit");
    }
    // Whitelist + normalise the update payload — never trust the client to set
    // createdBy / createdAt / ticketsRemaining directly outside of registrations.
    const payload = {};
    for (const [k, v] of Object.entries(updates)) {
        if (!ALLOWED_FIELDS.has(k))
            continue;
        if (k === "dateTime") {
            payload[k] = admin_1.admin.firestore.Timestamp.fromDate(new Date(v));
        }
        else if (k === "venues" && Array.isArray(v)) {
            const inVenues = v;
            payload.venues = inVenues.map((venue) => ({
                id: venue.id,
                name: venue.name,
                address: venue.address,
                dateTime: admin_1.admin.firestore.Timestamp.fromDate(new Date(venue.dateTime)),
                ticketLimit: Number(venue.ticketLimit),
                ticketsRemaining: typeof venue.ticketsRemaining === "number"
                    ? venue.ticketsRemaining
                    : Number(venue.ticketLimit),
            }));
            // Recompute aggregate ticket counts from the venues
            payload.ticketLimit = inVenues.reduce((s, x) => s + Number(x.ticketLimit), 0);
            payload.location = (_c = (_b = inVenues[0]) === null || _b === void 0 ? void 0 : _b.address) !== null && _c !== void 0 ? _c : (_d = eventSnap.data()) === null || _d === void 0 ? void 0 : _d.location;
        }
        else {
            payload[k] = v;
        }
    }
    await eventRef.update(payload);
    return { success: true };
});
//# sourceMappingURL=updateEvent.js.map