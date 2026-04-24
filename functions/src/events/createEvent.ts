import * as functions from "firebase-functions";
import { admin, db } from "../shared/admin";
import { requireAuth, requireOrganizer } from "../shared/auth";

export const createEvent = functions.https.onCall(async (request) => {
  const auth = requireAuth(request.auth);
  const userDoc = await requireOrganizer(auth.uid);

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
    createdByName: userDoc.data()?.name || "",
    flyerURL: data.flyerURL || "",
    category: data.category || "General",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("events").add(event);
  return { eventId: docRef.id };
});
