import * as functions from "firebase-functions";
import { db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

export const cancelRegistration = functions.https.onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { registrationId } = request.data;
  if (!registrationId) {
    throw new functions.https.HttpsError("invalid-argument", "Registration ID required");
  }

  const regDoc = await db.collection("registrations").doc(registrationId).get();
  if (!regDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Registration not found");
  }

  const regData = regDoc.data()!;
  if (regData.userId !== auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Can only cancel your own registration");
  }

  await db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(regData.eventId);
    const eventSnap = await transaction.get(eventRef);

    if (eventSnap.exists) {
      transaction.update(eventRef, {
        ticketsRemaining: eventSnap.data()!.ticketsRemaining + 1,
      });
    }
    transaction.update(db.collection("registrations").doc(registrationId), {
      status: "cancelled",
    });
  });

  return { success: true };
});
