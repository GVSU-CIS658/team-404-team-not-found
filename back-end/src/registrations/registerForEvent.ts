import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin, db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

export const registerForEvent = onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { eventId, venueId, venueName, venueAddress } = request.data;
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Event ID required");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  // Note: duplicate registrations are allowed — each call books one more ticket
  // for the same user/event so families and groups can register together.

  return db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found");
    }

    const eventData = eventSnap.data()!;

    if (venueId && Array.isArray(eventData.venues)) {
      // Multi-venue event: decrement the specific venue's remaining count and
      // also keep the event-level ticketsRemaining in sync as the sum of venues.
      const venues = [...eventData.venues];
      const idx = venues.findIndex((v: { id: string }) => v.id === venueId);
      if (idx === -1) {
        throw new HttpsError("not-found", "Venue not found on event");
      }
      if (venues[idx].ticketsRemaining <= 0) {
        throw new HttpsError(
          "resource-exhausted",
          "No tickets left for this venue",
        );
      }
      venues[idx] = {
        ...venues[idx],
        ticketsRemaining: venues[idx].ticketsRemaining - 1,
      };
      const totalRemaining = venues.reduce(
        (s: number, v: { ticketsRemaining: number }) => s + v.ticketsRemaining,
        0,
      );
      transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining });
    } else {
      // Single-venue event
      if (eventData.ticketsRemaining <= 0) {
        throw new HttpsError("resource-exhausted", "No tickets remaining");
      }
      transaction.update(eventRef, {
        ticketsRemaining: eventData.ticketsRemaining - 1,
      });
    }

    const regRef = db.collection("registrations").doc();
    const regDoc: Record<string, unknown> = {
      userId: auth.uid,
      userName: userDoc.data()?.name || "",
      eventId,
      eventTitle: eventData.title,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "confirmed",
    };
    if (venueId) regDoc.venueId = venueId;
    if (venueName) regDoc.venueName = venueName;
    if (venueAddress) regDoc.venueAddress = venueAddress;
    transaction.set(regRef, regDoc);

    return { registrationId: regRef.id };
  });
});
