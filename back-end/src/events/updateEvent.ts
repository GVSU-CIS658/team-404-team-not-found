import * as functions from "firebase-functions";
import { admin, db } from "../shared/admin";
import { requireAuth } from "../shared/auth";

interface VenueIn {
  id: string;
  name: string;
  address: string;
  dateTime: string | number | Date;
  ticketLimit: number;
  ticketsRemaining?: number;
}

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

export const updateEvent = functions.https.onCall(async (request) => {
  const auth = requireAuth(request.auth);

  const { eventId, updates } = request.data || {};
  if (!eventId || typeof updates !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "eventId and updates required");
  }

  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found");
  }
  if (eventSnap.data()?.createdBy !== auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Only the event creator can edit");
  }

  // Whitelist + normalise the update payload — never trust the client to set
  // createdBy / createdAt / ticketsRemaining directly outside of registrations.
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "dateTime") {
      payload[k] = admin.firestore.Timestamp.fromDate(new Date(v as string));
    } else if (k === "venues" && Array.isArray(v)) {
      const inVenues = v as VenueIn[];
      payload.venues = inVenues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        dateTime: admin.firestore.Timestamp.fromDate(new Date(venue.dateTime)),
        ticketLimit: Number(venue.ticketLimit),
        ticketsRemaining:
          typeof venue.ticketsRemaining === "number"
            ? venue.ticketsRemaining
            : Number(venue.ticketLimit),
      }));
      // Recompute aggregate ticket counts from the venues
      payload.ticketLimit = inVenues.reduce((s, x) => s + Number(x.ticketLimit), 0);
      payload.location = inVenues[0]?.address ?? eventSnap.data()?.location;
    } else {
      payload[k] = v;
    }
  }

  await eventRef.update(payload);
  return { success: true };
});
