import { NextRequest } from "next/server";
import { firestore } from "@/firebase/firebasedb";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function rateLimit(
  req: NextRequest,
  limit: number,
  duration: number, // duration in seconds
) {
  const ip = req.ip ?? "127.0.0.1";
  const key = `ratelimit_${ip}`;

  const rateLimitRef = doc(firestore, "rateLimits", key);
  const rateLimitDoc = await getDoc(rateLimitRef);

  const now = new Date();

  if (rateLimitDoc.exists()) {
    const data = rateLimitDoc.data();
    const lastRequest = data.lastRequest.toDate();
    const count = data.count;

    // Check if the duration has passed
    if ((now.getTime() - lastRequest.getTime()) / 1000 < duration) {
      if (count >= limit) {
        return { success: false };
      } else {
        // Increment the count
        await setDoc(
          rateLimitRef,
          {
            count: count + 1,
            lastRequest: serverTimestamp(),
          },
          { merge: true },
        );
        return { success: true };
      }
    } else {
      // Reset the count if the duration has passed
      await setDoc(rateLimitRef, {
        count: 1,
        lastRequest: serverTimestamp(),
      });
      return { success: true };
    }
  } else {
    // Create a new document for this IP
    await setDoc(rateLimitRef, {
      count: 1,
      lastRequest: serverTimestamp(),
    });
    return { success: true };
  }
}
