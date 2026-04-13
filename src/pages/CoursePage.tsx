import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { METRIC_SHORT } from "../metricLabels";
import { useReviewsState } from "../ReviewsContext";
import type { ProfessorAgg, Review } from "../types";

const ALL = "__all__";

function sortReviews(list: Review[]): Review[] {
  return [...list].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });
}

export function CoursePage() {
  const { code: rawCode } = useParams();
  const state = useReviewsState();
  const [profKey, setProfKey] = useState<string>(ALL);

  const course = useMemo(() => {
    if (state.status !== "ready" || !rawCode) return undefined;
    const code = decodeURIComponent(rawCode).toUpperCase();
    return state.data.courses.find((c) => c.code === code);
  }, [state, rawCode]);

  const visibleReviews = useMemo(() => {
    if (!course) return [];
    const list =
      profKey === ALL
        ? course.reviews
        : course.reviews.filter((r) => r.professorKey === profKey);
    return sortReviews(list);
  }, [course, profKey]);

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

  const agg: ProfessorAgg | null =
    profKey === ALL
      ? {
          professorKey: ALL,
          professor: "All professors (in reviews)",
          n: course.overall.n,
          averages: course.overall.averages,
          snippet: course.overall.snippet,
        }
      : course.byProfessor.find((p) => p.professorKey === profKey) ?? null;

  const legend = state.data.numericLegend;

  return (
    <>
      <Link className="back-link" to="/">
        ← All courses
      </Link>
      <div className="course-header">
        <h1>
          <span className="mono">{course.code}</span> · {course.title}
        </h1>
        <div className="meta-row">
          <span>
            Slot <span className="pill">{course.slot}</span>
          </span>
          <span>{course.credits} credits</span>
          <span>Current instructor: {course.currentInstructor}</span>
        </div>
      </div>

      <div className="select-row">
        <label htmlFor="prof-select">Professor in review</label>
        <select
          id="prof-select"
          className="prof-select"
          value={profKey}
          onChange={(e) => setProfKey(e.target.value)}
        >
          <option value={ALL}>All ({course.overall.n} reviews)</option>
          {course.byProfessor.map((p) => (
            <option key={p.professorKey} value={p.professorKey}>
              {p.professor} ({p.n})
            </option>
          ))}
        </select>
      </div>

      {!agg || agg.n === 0 ? (
        <div className="empty-state">
          No reviews matched this course in the exports yet, or none for the
          selected professor. This is normal if the course was not widely
          reviewed in past forms.
        </div>
      ) : (
        <>
          <div className="panel">
            <h2>
              Averages ({agg.n} review{agg.n === 1 ? "" : "s"})
            </h2>
            <div className="metrics">
              {Object.entries(agg.averages).map(([k, v]) => (
                <div key={k} className="metric">
                  <div className="label">
                    {METRIC_SHORT[k] ?? k}
                    {legend[k] ? (
                      <span title={legend[k]} style={{ cursor: "help" }}>
                        {" "}
                        ⓘ
                      </span>
                    ) : null}
                  </div>
                  <div className="value">{v.toFixed(2)}</div>
                </div>
              ))}
            </div>
            {Object.keys(agg.averages).length === 0 ? (
              <p className="page-lead" style={{ marginTop: "0.5rem" }}>
                No numeric ratings in this slice (HSS rows are often text-only for
                some fields).
              </p>
            ) : null}
          </div>

          <div className="panel">
            <div className="snippet-label">Latest snapshot (extractive)</div>
            <p className="snippet">
              {agg.snippet || "No text or ratings to preview for this slice."}
            </p>
          </div>
        </>
      )}

      <h2 className="reviews-heading">Individual reviews</h2>
      {visibleReviews.length === 0 ? (
        <p className="page-lead">No rows to show for this filter.</p>
      ) : (
        visibleReviews.map((r, i) => (
          <article key={`${r.timestamp ?? "x"}-${r.professorKey}-${i}`} className="review-card">
            <header>
              <strong>{r.professor}</strong>
              {r.timestamp ? (
                <span className="mono">{r.timestamp.slice(0, 10)}</span>
              ) : null}
              <span className="source-pill">
                {r.source === "bsw" ? "BSW form" : "HSS form"}
              </span>
            </header>
            {Object.keys(r.labels).length > 0 ? (
              <div className="review-labels">
                {Object.entries(r.labels).map(([k, v]) => (
                  <span key={k} className="chip">
                    {METRIC_SHORT[k] ?? k}: {v}
                  </span>
                ))}
              </div>
            ) : null}
            {r.textBlocks.map((tb) => (
              <div key={tb.label} className="review-block">
                <div className="blabel">{tb.label}</div>
                <div className="bvalue">{tb.value}</div>
              </div>
            ))}
          </article>
        ))
      )}
    </>
  );
}
