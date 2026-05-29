import { Link } from "react-router-dom";

type AccountPromptProps = {
  variant?: "banner" | "card";
};

export default function AccountPrompt({ variant = "banner" }: AccountPromptProps) {
  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-ink">Save your progress</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Create an account to keep quiz history, accuracy, and scores synced
          across devices—not just on this browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Log in
          </Link>
          <Link
            to="/login"
            className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink">Want your history everywhere?</p>
          <p className="mt-1 text-sm text-muted">
            Log in or create an account to save quiz results and accuracy across
            multiple devices.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Log in
          </Link>
          <Link
            to="/login"
            className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
