import * as functions from "firebase-functions";
import { db } from "./admin";

export function requireAuth(auth: { uid: string } | null | undefined): { uid: string } {
  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  return auth;
}

export async function requireOrganizer(uid: string) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "organizer") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only organizers can perform this action",
    );
  }
  return userDoc;
}
