import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountPrompt from "../../components/dashboard/AccountPrompt";
import { createTempUser, getTempUser, setTempUser } from "../../utils/tempUser";

const featuredQuizzes = [
  {
    title: "General Knowledge (Quick)",
    desc: "A short set of questions to warm up.",
    locked: true,
  },
  {
    title: "Tech Trivia",
    desc: "Frontend, backend, and everything in between.",
    locked: true,
  },
  {
    title: "Sports & Movies",
    desc: "Fun mix for casual sessions.",
    locked: true,
  },
];

function normalizeCode(input: string) {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

function randomCodeHint() {
  const samples = ["AB12", "QUIZ7", "MAY1", "LIVE9"];
  return samples[Math.floor(Math.random() * samples.length)]!;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [name, setName] = useState("");

  const codeHint = useMemo(() => randomCodeHint(), []);

  function goToLobby() {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;
    navigate(`/dashboard/session/${finalCode}`);
  }

  function handleJoin() {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;

    const existing = getTempUser();
    if (!existing) {
      setShowNameModal(true);
      return;
    }
    goToLobby();
  }

  function handleCreateTempUser() {
    const user = createTempUser(name);
    setTempUser(user);
    setShowNameModal(false);
    goToLobby();
  }

  return (
    <div className="grid gap-10">
        <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                Join a live quiz
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Enter the session code to join and wait in the lobby. You can
                change your display name anytime.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="w-full sm:w-64">
                <label className="sr-only" htmlFor="sessionCode">
                  Session code
                </label>
                <input
                id="sessionCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`e.g. ${codeHint}`}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
              <p className="mt-2 text-xs text-muted">
                Tip: codes are usually 4–6 characters.
              </p>
            </div>

            <button
              onClick={handleJoin}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Join lobby
            </button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Host a session instead?
            </span>
            <button
              onClick={() => navigate("/dashboard/create")}
              className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface-soft"
            >
              Create a room
            </button>
          </div>
        </section>

      <section className="rounded-2xl border border-line bg-surface-soft p-7 md:p-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Quizzes by us</h2>
            <p className="mt-2 text-sm text-muted">
              These are curated quizzes. Log in to start them.
            </p>
          </div>
          <a
            href="/login"
            className="hidden rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-brand-50 md:inline-flex"
          >
            Log in to unlock
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredQuizzes.map((q) => (
            <article
              key={q.title}
              className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-ink">{q.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {q.desc}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-surface-soft px-3 py-1 text-xs font-semibold text-ink">
                  Locked
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-muted">Requires login</p>
                <a
                  href="/login"
                  className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
                >
                  Login to start
                </a>
              </div>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-brand-50 opacity-70" />
            </article>
          ))}
        </div>
      </section>

      <AccountPrompt />

      {showNameModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Choose a display name</h3>
            <p className="mt-2 text-sm text-muted">
              We’ll save it on this device so you can join faster next time.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-muted" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mayank"
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowNameModal(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTempUser}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
