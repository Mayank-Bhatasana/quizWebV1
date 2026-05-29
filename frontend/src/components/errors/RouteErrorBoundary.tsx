import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import NotFound from "../../pages/errors/NotFound";

export default function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";

  const message = isRouteErrorResponse(error)
    ? error.data?.message ?? "We couldn't load this page."
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
        Error
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Go home
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
