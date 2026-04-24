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
    if (!data.title || !data.description || !data.location || !data.dateTime || !data.ticketLimit) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    if (data.ticketLimit < 1 || data.ticketLimit > 10000) {
        throw new functions.https.HttpsError("invalid-argument", "Ticket limit must be between 1 and 10000");
    }
    const event = {
        title: data.title,
        description: data.description,
        location: data.location,
        dateTime: admin_1.admin.firestore.Timestamp.fromDate(new Date(data.dateTime)),
        ticketLimit: data.ticketLimit,
        ticketsRemaining: data.ticketLimit,
        createdBy: auth.uid,
        createdByName: ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "",
        flyerURL: data.flyerURL || "",
        category: data.category || "General",
        createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await admin_1.db.collection("events").add(event);
    return { eventId: docRef.id };
});
//# sourceMappingURL=createEvent.js.map