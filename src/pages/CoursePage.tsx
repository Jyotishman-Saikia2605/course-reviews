import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useReviewsState } from "../ReviewsContext";

export function CoursePage() {
  const { code: rawCode } = useParams();
  const state = useReviewsState();

  const course = useMemo(() => {
    if (state.status !== "ready" || !rawCode) return undefined;
    const code = decodeURIComponent(rawCode).toUpperCase();
    return state.data.courses.find((c) => c.code === code);
  }, [state, rawCode]);

  if (state.status === "loading") {
    return <p className="loading">Loading…</p>;
  }
  if (state.status === "error") {
    return (
      <div className="error-banner" role="alert">
        Could not load data: {state.message}
      </div>
    );
  }

  if (!course) {
    return (
      <>
        <Link className="back-link" to="/">
          ← All courses
        </Link>
        <div className="empty-state">No course found for this code.</div>
      </>
    );
  }

  return (
    <>
      <Link className="back-link" to="/">
        ← All courses
      </Link>
      <div className="panel">
        <h1>
          <span className="mono">{course.code}</span>
        </h1>
        <p className="snippet">Itni mehnat kyu karu? Convener thodi jaa raha hu</p>
      </div>
    </>
  );
}
