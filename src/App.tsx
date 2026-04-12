import { Link, Outlet } from "react-router-dom";
import { ReviewsProvider } from "./ReviewsContext";

export default function App() {
  return (
    <ReviewsProvider>
      <div className="layout">
        <header className="topbar">
          <Link to="/" className="brand">
            HU course reviews
          </Link>
          <span className="tagline">Unofficial aggregated feedback</span>
        </header>
        <main className="main">
          <Outlet />
        </main>
        <footer className="footer">
          Data comes from past form exports; numeric scales differ slightly between
          sources (see legends on each course page).
        </footer>
      </div>
    </ReviewsProvider>
  );
}
