import { Link } from "react-router-dom";
import AccountPrompt from "../../components/dashboard/AccountPrompt";

export default function DashboardAnalytics() {
  return (
    <div className="grid gap-8">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-ink">Analytics</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Take a quiz to see your scores, accuracy, and how you compare. Right
          now there&apos;s nothing to show yet—join a session or unlock a quiz
          to get started.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Quizzes taken
            </p>
            <p className="mt-2 text-3xl font-extrabold text-ink">—</p>
          </div>
          <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Accuracy
            </p>
            <p className="mt-2 text-3xl font-extrabold text-ink">—</p>
          </div>
          <div className="rounded-2xl border border-dashed border-line bg-surface-soft p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Best score
            </p>
            <p className="mt-2 text-3xl font-extrabold text-ink">—</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Join a session
          </Link>
          <Link
            to="/login"
            className="inline-flex rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Unlock quizzes by us
          </Link>
        </div>
      </div>

      <AccountPrompt variant="card" />
    </div>
  );
}
