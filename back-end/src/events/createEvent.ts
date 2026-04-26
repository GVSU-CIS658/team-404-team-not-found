import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin, db } from "../shared/admin";
import { requireAuth, requireOrganizer } from "../shared/auth";

interface VenueIn {
  id: string;
  name: string;
  address: string;
  dateTime: string | number | Date;
  ticketLimit: number;
  ticketsRemaining?: number;
}

export const createEvent = onCall(async (request) => {
  const auth = requireAuth(request.auth);
  const userDoc = await requireOrganizer(auth.uid);

  const data = request.data;
  if (!data.title || !data.description) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const venues: VenueIn[] | undefined = Array.isArray(data.venues) && data.venues.length > 0
    ? data.venues
    : undefined;

  // Multi-venue: capacity is the sum of each venue's capacity.
  // Single-venue: caller passes a top-level ticketLimit.
  const totalLimit = venues
    ? venues.reduce((sum, v) => sum + Number(v.ticketLimit || 0), 0)
    : Number(data.ticketLimit);

  if (!totalLimit || totalLimit < 1 || totalLimit > 100000) {
    throw new HttpsError(
      "invalid-argument",
      "Total ticket capacity must be between 1 and 100000",
    );
  }

  const primaryDate = venues
    ? new Date(venues[0].dateTime)
    : new Date(data.dateTime);
  const primaryLocation = venues ? venues[0].address : data.location;

  if (!primaryLocation) {
    throw new HttpsError("invalid-argument", "Location required");
  }

  const event: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    location: primaryLocation,
    dateTime: admin.firestore.Timestamp.fromDate(primaryDate),
    ticketLimit: totalLimit,
    ticketsRemaining: totalLimit,
    createdBy: auth.uid,
    createdByName: userDoc.data()?.name || "",
    flyerURL: data.flyerURL || "",
    category: data.category || "General",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (venues) {
    event.venues = venues.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      dateTime: admin.firestore.Timestamp.fromDate(new Date(v.dateTime)),
      ticketLimit: Number(v.ticketLimit),
      ticketsRemaining: Number(v.ticketLimit),
    }));
  }

  const docRef = await db.collection("events").add(event);
  return { eventId: docRef.id };
});
