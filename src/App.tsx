import { Link, Outlet } from "react-router-dom";
import { ReviewsProvider } from "./ReviewsContext";

export default function App() {
  return (
    <ReviewsProvider>
      <div className="layout">
        <header className="topbar">
          <Link to="/" className="brand">
            HUL course reviews
          </Link>
          <span className="top-credit">made by Jyotishman Saikia</span>
          <span className="top-semester">odd semester 2026-27</span>
          <span className="tagline">Unofficial aggregated feedback</span>
        </header>
        <main className="main">
          <Outlet />
        </main>
        <footer className="footer">
          <p className="footer-note">
            Data comes from past form exports; numeric scales differ slightly between
            sources (see legends on each course page).
          </p>
        </footer>
      </div>
    </ReviewsProvider>
  );
}
