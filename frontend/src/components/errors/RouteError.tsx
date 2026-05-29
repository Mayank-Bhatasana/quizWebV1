import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router-dom";

export default function RouteError() {
  const error = useRouteError();
  const inDashboard = window.location.pathname.startsWith("/dashboard");

  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      message =
        "The page you're looking for doesn't exist or may have been moved.";
    } else {
      title = `${error.status} ${error.statusText}`;
      message = error.data?.message ?? message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-[50vh] bg-white">
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
          Error
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={inDashboard ? "/dashboard" : "/"}
            className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {inDashboard ? "Back to dashboard" : "Back to home"}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
