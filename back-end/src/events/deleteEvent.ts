import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

export const deleteEvent = onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { eventId } = request.data;
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Event ID required");
  }

  const eventDoc = await db.collection("events").doc(eventId).get();
  if (!eventDoc.exists) {
    throw new HttpsError("not-found", "Event not found");
  }
  if (eventDoc.data()?.createdBy !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the event creator can delete");
  }

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
