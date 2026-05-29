import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import { createGuest, joinRoom } from "../../services/quizApi";

type LobbyParticipant = {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarBg: string;
};

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function makeDemoParticipants(my: LobbyParticipant) {
  const others: LobbyParticipant[] = [
    { id: "p2", name: "Aarav", avatarEmoji: "⚡", avatarBg: "bg-amber-100" },
    { id: "p3", name: "Sara", avatarEmoji: "🌟", avatarBg: "bg-rose-100" },
    { id: "p4", name: "Kunal", avatarEmoji: "🎯", avatarBg: "bg-emerald-100" },
  ];
  return [my, ...others];
}

export default function SessionLobby() {
  const params = useParams();
  const code = codeFromParam(params.code);

  const tempUser = getTempUser();
  const myParticipant: LobbyParticipant = useMemo(() => {
    const name = tempUser?.name?.trim() || "Guest";
    const avatarEmoji = tempUser?.avatar?.emoji ?? "🧠";
    const avatarBg = tempUser?.avatar?.bg ?? "bg-slate-200";
    return { id: tempUser?.id ?? "me", name, avatarEmoji, avatarBg };
  }, [tempUser]);

  const [participants] = useState<LobbyParticipant[]>(
    () => makeDemoParticipants(myParticipant),
  );
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(myParticipant.name);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remainingSeconds = 90;

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  function saveName() {
    const next = name.trim().slice(0, 30);
    if (!next) return;

    const existing = getTempUser();
    if (!existing) {
      setTempUser({
        id: myParticipant.id,
        name: next,
        avatar: { emoji: myParticipant.avatarEmoji, bg: myParticipant.avatarBg },
      });
    } else {
      updateTempUser({ name: next });
    }
    setShowEdit(false);
  }

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    async function ensureGuestAndJoin() {
      setStatus("Connecting...");
      setError(null);

      let local = getTempUser();
      if (!local) {
        local = createTempUser(name);
        setTempUser(local);
      }

      try {
        const guest = await createGuest(local.name);
        if (cancelled) return;

        const profileId = guest.profile.id;
        const joined = await joinRoom(code, {
          profileId,
          displayName: local.name,
        });
        if (cancelled) return;

        updateTempUser({ profileId, participantId: joined.participant.id });
        setStatus("Connected");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to join session";
        setError(message);
        setStatus(null);
      }
    }

    ensureGuestAndJoin();

    return () => {
      cancelled = true;
    };
  }, [code, name]);

  if (!code) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-ink">Invalid session</h1>
        <p className="mt-2 text-sm text-muted">
          Missing session code. Go back and join with a valid code.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink md:text-3xl">
              Lobby
            </h1>
            <p className="mt-2 text-sm text-muted">
              {error ? error : "Waiting for the host to start the quiz."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-surface-soft px-4 py-2 text-sm font-semibold text-ink">
              Code: <span className="font-extrabold">{code}</span>
            </span>
            <button
              onClick={copyCode}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-soft"
            >
              Copy
            </button>
            <Link
              to="/dashboard"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Leave
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Joined
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {participants.length}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Time left (demo)
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {Math.floor(remainingSeconds / 60)}:
              {String(remainingSeconds % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Status
            </p>
            <p className="mt-2 text-2xl font-extrabold text-ink">
              {status ?? "Waiting"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Participants</h2>
            <p className="mt-1 text-sm text-muted">
              Showing demo list for now (real-time later).
            </p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
          >
            Change name
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-white px-5 py-4"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-ink ${p.avatarBg}`}
                aria-hidden
              >
                {p.avatarEmoji}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  {p.id === myParticipant.id ? "You" : "Participant"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showEdit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Edit your name</h3>
            <p className="mt-2 text-sm text-muted">
              This updates your local profile on this device.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-muted" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                onClick={saveName}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
