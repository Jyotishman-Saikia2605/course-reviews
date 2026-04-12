import type { ReviewBundle } from "./types";

export async function loadReviews(): Promise<ReviewBundle> {
  const res = await fetch("/data/reviews.json");
  if (!res.ok) {
    throw new Error(`Failed to load reviews (${res.status})`);
  }
  return res.json() as Promise<ReviewBundle>;
}
