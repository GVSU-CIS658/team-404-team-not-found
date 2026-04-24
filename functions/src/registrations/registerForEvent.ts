import * as functions from "firebase-functions";
import { admin, db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

export const registerForEvent = functions.https.onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { eventId } = request.data;
  if (!eventId) {
    throw new functions.https.HttpsError("invalid-argument", "Event ID required");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User not found");
  }

  const existingReg = await db
    .collection("registrations")
    .where("userId", "==", auth.uid)
    .where("eventId", "==", eventId)
    .where("status", "==", "confirmed")
    .get();

  if (!existingReg.empty) {
    throw new functions.https.HttpsError("already-exists", "Already registered for this event");
  }

  return db.runTransaction(async (transaction) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Event not found");
    }

    const eventData = eventSnap.data()!;
    if (eventData.ticketsRemaining <= 0) {
      throw new functions.https.HttpsError("resource-exhausted", "No tickets remaining");
    }

    transaction.update(eventRef, {
      ticketsRemaining: eventData.ticketsRemaining - 1,
    });

    const regRef = db.collection("registrations").doc();
    transaction.set(regRef, {
      userId: auth.uid,
      userName: userDoc.data()?.name || "",
      eventId,
      eventTitle: eventData.title,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "confirmed",
    });

    return { registrationId: regRef.id };
  });
});
