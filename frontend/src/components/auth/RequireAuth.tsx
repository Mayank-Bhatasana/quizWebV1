import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../../query/queries";

export default function RequireAuth() {
  const location = useLocation();
  const { data, isLoading, isError } = useAuthSession();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm font-semibold text-muted sm:px-6">
        Checking your session…
      </div>
    );
  }

  if (isError || !data?.user?.id) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
