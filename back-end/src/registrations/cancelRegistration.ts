import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

export const cancelRegistration = onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { registrationId } = request.data;
  if (!registrationId) {
    throw new HttpsError("invalid-argument", "Registration ID required");
  }

  const regRef = db.collection("registrations").doc(registrationId);

  await db.runTransaction(async (transaction) => {
    const regSnap = await transaction.get(regRef);
    if (!regSnap.exists) {
      throw new HttpsError("not-found", "Registration not found");
    }
    const regData = regSnap.data()!;
    if (regData.userId !== auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Can only cancel your own registration",
      );
    }
    // Idempotent: if already cancelled, nothing to do (and don't double-credit).
    if (regData.status === "cancelled") return;

    const eventRef = db.collection("events").doc(regData.eventId);
    const eventSnap = await transaction.get(eventRef);

    if (eventSnap.exists) {
      const eventData = eventSnap.data()!;
      if (regData.venueId && Array.isArray(eventData.venues)) {
        const venues = [...eventData.venues];
        const idx = venues.findIndex(
          (v: { id: string }) => v.id === regData.venueId,
        );
        if (idx !== -1) {
          // Cap re-increment at the venue's ticketLimit to prevent overflow.
          const capped = Math.min(
            venues[idx].ticketsRemaining + 1,
            venues[idx].ticketLimit,
          );
          venues[idx] = { ...venues[idx], ticketsRemaining: capped };
          const totalRemaining = venues.reduce(
            (s: number, v: { ticketsRemaining: number }) => s + v.ticketsRemaining,
            0,
          );
          transaction.update(eventRef, { venues, ticketsRemaining: totalRemaining });
        }
      } else {
        const limit = eventData.ticketLimit ?? Number.MAX_SAFE_INTEGER;
        const capped = Math.min((eventData.ticketsRemaining ?? 0) + 1, limit);
        transaction.update(eventRef, { ticketsRemaining: capped });
      }
    }

    transaction.update(regRef, { status: "cancelled" });
  });

  return { success: true };
});
