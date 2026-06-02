import { useState } from "react";
import AccountPrompt from "../../components/dashboard/AccountPrompt";
import { useTempUser } from "../../hooks/useTempUser";
import { createTempUser, setTempUser } from "../../utils/tempUser";

export default function DashboardProfile() {
  const existing = useTempUser();
  const [name, setName] = useState("");
  const effectiveName = name || existing?.name || "";

  const preview = existing ?? createTempUser(effectiveName || "Guest");

  function save() {
    const user = existing
      ? { ...existing, name: effectiveName.trim().slice(0, 30) || "Guest" }
      : createTempUser(effectiveName || "Guest");
    setTempUser(user);
    setName("");
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-ink">Profile</h1>
        <p className="mt-2 text-sm text-muted">
          This profile is stored locally for quick joining.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-ink ${
              preview.avatar.bg
            }`}
            aria-hidden
          >
            {preview.avatar.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{preview.name}</p>
            <p className="text-xs text-muted">Participant</p>
          </div>
        </div>

        <div className="mt-6 max-w-md">
          <label className="text-xs font-semibold text-muted" htmlFor="name">
            Display name
          </label>
          <input
            id="name"
            value={effectiveName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              const user = createTempUser(effectiveName || "Guest");
              setTempUser(user);
              setName("");
            }}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Randomize avatar
          </button>
        </div>
      </div>

      <AccountPrompt variant="card" />
    </div>
  );
}
