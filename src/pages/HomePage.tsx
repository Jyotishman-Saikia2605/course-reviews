import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useReviewsState } from "../ReviewsContext";
import type { Course } from "../types";

type TabFilter = "all" | "with-reviews" | "offered";
type SortField = "code" | "title" | "slot" | "credits" | "currentInstructor" | "reviewCount";

export function HomePage() {
  const state = useReviewsState();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [sortField, setSortField] = useState<SortField>("reviewCount");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const courses = state.status === "ready" ? state.data.courses : [];

  const counts = useMemo(() => {
    return {
      all: courses.length,
      withReviews: courses.filter((c) => c.reviewCount > 0).length,
      offered: courses.filter((c) => c.offeredThisSem).length,
    };
  }, [courses]);

  const totalReviews = useMemo(() => {
    return courses.reduce((sum, c) => sum + c.reviewCount, 0);
  }, [courses]);

  const filteredAndSorted = useMemo(() => {
    let list = courses;

    // Apply Tab filter
    if (tab === "with-reviews") {
      list = list.filter((c) => c.reviewCount > 0);
    } else if (tab === "offered") {
      list = list.filter((c) => c.offeredThisSem);
    }

    // Apply Search query
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) => {
        if (
          c.code.toLowerCase().includes(needle) ||
          c.title.toLowerCase().includes(needle) ||
          c.currentInstructor.toLowerCase().includes(needle) ||
          c.slot.toLowerCase().includes(needle)
        ) {
          return true;
        }
        // Also search in past professor names
        return c.byProfessor.some((p) =>
          p.professor.toLowerCase().includes(needle),
        );
      });
    }

    // Apply Sorting
    return [...list].sort((a: Course, b: Course) => {
      let cmp = 0;
      if (sortField === "reviewCount") {
        cmp = a.reviewCount - b.reviewCount;
      } else if (sortField === "credits") {
        cmp = a.credits - b.credits;
      } else {
        const valA = (a[sortField] || "").toLowerCase();
        const valB = (b[sortField] || "").toLowerCase();
        cmp = valA.localeCompare(valB);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [courses, tab, q, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Default descending for reviewCount and credits, ascending for text columns
      setSortAsc(field !== "reviewCount" && field !== "credits");
    }
  };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="sort-arrow">{sortAsc ? "▲" : "▼"}</span>;
  };

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

  const { generatedAt } = state.data;

  return (
    <>
      <h1 className="page-title">Humanities (HU) Course Reviews</h1>
      <p className="page-lead">
        Comprehensive reviews compiled from unofficial BSW and HSS form exports.
        Showing all {totalReviews} reviews across {counts.all} courses (current semester offerings and past reviewed courses).
        Dataset generated{" "}
        <span className="mono">{generatedAt.slice(0, 19).replace("T", " ")}</span> UTC.
      </p>

      <div className="filter-tabs">
        <button
          type="button"
          className={`filter-tab ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
        >
          All courses <span className="tab-badge">{counts.all}</span>
        </button>
        <button
          type="button"
          className={`filter-tab ${tab === "with-reviews" ? "active" : ""}`}
          onClick={() => setTab("with-reviews")}
        >
          With reviews <span className="tab-badge">{counts.withReviews}</span>
        </button>
        <button
          type="button"
          className={`filter-tab ${tab === "offered" ? "active" : ""}`}
          onClick={() => setTab("offered")}
        >
          Offered this semester <span className="tab-badge">{counts.offered}</span>
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search code, title, professor, instructor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter courses"
        />
        <div className="result-count">
          Showing {filteredAndSorted.length} of {courses.length} courses
        </div>
      </div>

      <div className="table-wrap">
        <table className="catalog">
          <thead>
            <tr>
              <th className="th-sortable" onClick={() => handleSort("code")}>
                Code {renderSortArrow("code")}
              </th>
              <th className="th-sortable" onClick={() => handleSort("title")}>
                Course {renderSortArrow("title")}
              </th>
              <th className="th-sortable" onClick={() => handleSort("slot")}>
                Slot {renderSortArrow("slot")}
              </th>
              <th className="th-sortable" onClick={() => handleSort("credits")}>
                Cr {renderSortArrow("credits")}
              </th>
              <th
                className="th-sortable"
                onClick={() => handleSort("currentInstructor")}
              >
                Current instructor {renderSortArrow("currentInstructor")}
              </th>
              <th
                className="th-sortable"
                onClick={() => handleSort("reviewCount")}
              >
                Reviews {renderSortArrow("reviewCount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem" }}>
                  No courses match your search or filter.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((c) => (
                <tr key={c.code}>
                  <td>
                    <Link to={`/course/${encodeURIComponent(c.code)}`}>
                      <span className="mono">{c.code}</span>
                    </Link>
                  </td>
                  <td>{c.title}</td>
                  <td>
                    {c.offeredThisSem && c.slot !== "—" ? (
                      <span className="pill">{c.slot}</span>
                    ) : (
                      <span className="pill pill-muted">Past</span>
                    )}
                  </td>
                  <td>{c.credits}</td>
                  <td>
                    {c.offeredThisSem
                      ? c.currentInstructor
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`reviews-badge ${
                        c.reviewCount === 0 ? "zero" : ""
                      }`}
                    >
                      {c.reviewCount}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
