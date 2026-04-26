"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRegistration = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../shared/admin");
const auth_1 = require("../shared/auth");
exports.cancelRegistration = (0, https_1.onCall)(async (request) => {
    const auth = (0, auth_1.requireAuth)(request.auth);
    const { registrationId } = request.data;
    if (!registrationId) {
        throw new https_1.HttpsError("invalid-argument", "Registration ID required");
    }
    const regRef = admin_1.db.collection("registrations").doc(registrationId);
    await admin_1.db.runTransaction(async (transaction) => {
        var _a, _b;
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists) {
            throw new https_1.HttpsError("not-found", "Registration not found");
        }
        const regData = regSnap.data();
        if (regData.userId !== auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Can only cancel your own registration");
        }
        // Idempotent: if already cancelled, nothing to do (and don't double-credit).
        if (regData.status === "cancelled")
            return;
        const eventRef = admin_1.db.collection("events").doc(regData.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists) {
            const eventData = eventSnap.data();
            if (regData.venueId && Array.isArray(eventData.venues)) {
                const venues = [...eventData.venues];
                const idx = venues.findIndex((v) => v.id === regData.venueId);
                if (idx !== -1) {
                    // Cap re-increment at the venue's ticketLimit to prevent overflow.
                    const capped = Math.min(venues[idx].ticketsRemaining + 1, venues[idx].ticketLimit);
                    venues[idx] = { ...venues[idx], ticketsRemaining: capped };
                    const totalRemaining = venues.reduce((s, v) => s + v.ticketsRemaining, 0);
                    transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining });
                }
            }
            else {
                const limit = (_a = eventData.ticketLimit) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER;
                const capped = Math.min(((_b = eventData.ticketsRemaining) !== null && _b !== void 0 ? _b : 0) + 1, limit);
                transaction.update(eventRef, { ticketsRemaining: capped });
            }
        }
        transaction.update(regRef, { status: "cancelled" });
    });
    return { success: true };
});
//# sourceMappingURL=cancelRegistration.js.map