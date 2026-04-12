import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadReviews } from "./loadReviews";
import type { ReviewBundle } from "./types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReviewBundle };

const ReviewsContext = createContext<State | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadReviews()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Unknown error";
          setState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
  );
}

export function useReviewsState(): State {
  const ctx = useContext(ReviewsContext);
  if (!ctx) {
    throw new Error("useReviewsState must be used within ReviewsProvider");
  }
  return ctx;
}
