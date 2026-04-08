"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.cancelRegistration = exports.registerForEvent = exports.createEvent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
/**
 * Cloud Function: createEvent
 * Validates and creates an event. Only organizers can create events.
 * Business logic lives here, not in the frontend.
 */
exports.createEvent = functions.https.onCall(async (request) => {
    var _a, _b;
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "organizer") {
        throw new functions.https.HttpsError("permission-denied", "Only organizers can create events");
    }
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
        dateTime: admin.firestore.Timestamp.fromDate(new Date(data.dateTime)),
        ticketLimit: data.ticketLimit,
        ticketsRemaining: data.ticketLimit,
        createdBy: auth.uid,
        createdByName: ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.name) || "",
        flyerURL: data.flyerURL || "",
        category: data.category || "General",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("events").add(event);
    return { eventId: docRef.id };
});
/**
 * Cloud Function: registerForEvent
 * Handles event registration with atomic ticket decrement.
 * Uses a transaction to prevent overselling.
 */
exports.registerForEvent = functions.https.onCall(async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { eventId } = request.data;
    if (!eventId) {
        throw new functions.https.HttpsError("invalid-argument", "Event ID required");
    }
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
    }
    // Check for existing registration
    const existingReg = await db
        .collection("registrations")
        .where("userId", "==", auth.uid)
        .where("eventId", "==", eventId)
        .where("status", "==", "confirmed")
        .get();
    if (!existingReg.empty) {
        throw new functions.https.HttpsError("already-exists", "Already registered for this event");
    }
    // Atomic registration with transaction
    const result = await db.runTransaction(async (transaction) => {
        var _a;
        const eventRef = db.collection("events").doc(eventId);
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
        const regRef = db.collection("registrations").doc();
        transaction.set(regRef, {
            userId: auth.uid,
            userName: ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "",
            eventId,
            eventTitle: eventData.title,
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "confirmed",
        });
        return { registrationId: regRef.id };
    });
    return result;
});
/**
 * Cloud Function: cancelRegistration
 * Cancels a registration and restores the ticket count atomically.
 */
exports.cancelRegistration = functions.https.onCall(async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { registrationId } = request.data;
    if (!registrationId) {
        throw new functions.https.HttpsError("invalid-argument", "Registration ID required");
    }
    const regDoc = await db.collection("registrations").doc(registrationId).get();
    if (!regDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Registration not found");
    }
    const regData = regDoc.data();
    if (regData.userId !== auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Can only cancel your own registration");
    }
    await db.runTransaction(async (transaction) => {
        const eventRef = db.collection("events").doc(regData.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (eventSnap.exists) {
            transaction.update(eventRef, {
                ticketsRemaining: eventSnap.data().ticketsRemaining + 1,
            });
        }
        transaction.update(db.collection("registrations").doc(registrationId), {
            status: "cancelled",
        });
    });
    return { success: true };
});
/**
 * Cloud Function: deleteEvent
 * Only the organizer who created an event can delete it.
 * Also cancels all registrations for that event.
 */
exports.deleteEvent = functions.https.onCall(async (request) => {
    var _a;
    const auth = request.auth;
    if (!auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { eventId } = request.data;
    if (!eventId) {
        throw new functions.https.HttpsError("invalid-argument", "Event ID required");
    }
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Event not found");
    }
    if (((_a = eventDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy) !== auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the event creator can delete");
    }
    // Cancel all registrations for this event
    const registrations = await db
        .collection("registrations")
        .where("eventId", "==", eventId)
        .where("status", "==", "confirmed")
        .get();
    const batch = db.batch();
    registrations.docs.forEach((doc) => {
        batch.update(doc.ref, { status: "cancelled" });
    });
    batch.delete(db.collection("events").doc(eventId));
    await batch.commit();
    return { success: true };
});
//# sourceMappingURL=index.js.map