import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();
  const inDashboard = location.pathname.startsWith("/dashboard");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to={inDashboard ? "/dashboard" : "/"}
          className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {inDashboard ? "Back to dashboard" : "Back to home"}
        </Link>
        {!inDashboard ? (
          <Link
            to="/dashboard"
            className="inline-flex rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Go to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
