import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useReviewsState } from "../ReviewsContext";

export function HomePage() {
  const state = useReviewsState();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return state.data.courses;
    return state.data.courses.filter(
      (c) =>
        c.code.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle) ||
        c.currentInstructor.toLowerCase().includes(needle),
    );
  }, [state, q]);

  if (state.status === "loading") {
    return <p className="loading">Loading course list…</p>;
  }
  if (state.status === "error") {
    return (
      <div className="error-banner" role="alert">
        Could not load data: {state.message}
      </div>
    );
  }

  const { generatedAt, droppedOrSkippedRowsApprox } = state.data;

  return (
    <>
      <h1 className="page-title">HUL offerings</h1>
      <p className="page-lead">
        Reviews are aggregated from unofficial form exports. Only courses on the
        current allowlist appear here. Dataset generated{" "}
        <span className="mono">{generatedAt.slice(0, 19).replace("T", " ")}</span>{" "}
        UTC · about{" "}
        <span className="mono">{droppedOrSkippedRowsApprox}</span> spreadsheet
        rows skipped (other codes or missing course field).
      </p>
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search code, title, or current instructor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter courses"
        />
      </div>
      <div className="table-wrap">
        <table className="catalog">
          <thead>
            <tr>
              <th>Code</th>
              <th>Course</th>
              <th>Slot</th>
              <th>Cr</th>
              <th>Current instructor</th>
              <th>Reviews</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.code}>
                <td>
                  <Link to={`/course/${encodeURIComponent(c.code)}`}>
                    <span className="mono">{c.code}</span>
                  </Link>
                </td>
                <td>{c.title}</td>
                <td>
                  <span className="pill">{c.slot}</span>
                </td>
                <td>{c.credits}</td>
                <td>{c.currentInstructor}</td>
                <td>{c.reviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
