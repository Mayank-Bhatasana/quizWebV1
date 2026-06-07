import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import AccountPrompt from "../../components/dashboard/AccountPrompt";
import { createTempUser, getTempUser, setTempUser, updateTempUser } from "../../utils/tempUser";
import { useCreateGuest, useCreateQuestion, useCreateRoom } from "../../query/queries";

// ── QR Scanner component (html5-qrcode, dynamically imported) ─────────────────
const SCANNER_ID = "qr-scanner-element";

function QrScannerView({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeType | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // Dynamically import html5-qrcode — it's 3.4 MB so we only load it
        // when the user actually opens the camera scanner.
        const { Html5Qrcode } = await import("html5-qrcode");

        // Enumerate cameras — the only reliable cross-device approach.
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!devices || devices.length === 0) {
          setError("No camera found on this device.");
          return;
        }

        // Prefer a rear camera; fall back to last (rear is last on iOS/Android).
        const rear =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1];

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          rear.id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            scanner.stop().catch(() => {});
            onScan(text);
          },
          () => { /* frame errors — ignore */ },
        );

        if (!cancelled) setReady(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          /permission|denied|notallowed/i.test(msg)
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : /notfound|devicenotfound/i.test(msg)
            ? "No camera found on this device."
            : msg,
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <span className="text-3xl">📷</span>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-brand-300 bg-black shadow-xl">
        {/* Corner brackets */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-brand-400" />
        <div className="pointer-events-none absolute right-3 top-3 z-10 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-brand-400" />
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-brand-400" />
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-brand-400" />
        {/* Sweep line — only shown once camera is live */}
        {ready && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-brand-500 opacity-90 shadow-[0_0_8px_3px_rgba(99,102,241,0.7)]"
            style={{ animation: "scanLine 2s linear infinite" }}
          />
        )}
        {/* html5-qrcode mounts the video feed into this div */}
        <div id={SCANNER_ID} className="w-full" style={{ minHeight: "260px" }} />
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        {ready ? "Scanning… point your camera at the QR code" : "Starting camera…"}
      </p>
    </div>
  );
}

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

  const createGuestMutation = useCreateGuest();
  const createQuestionMutation = useCreateQuestion();
  const createRoomMutation = useCreateRoom();
  const [isDemoCreating, setIsDemoCreating] = useState(false);

  async function handleCreateDemoRoom() {
    setIsDemoCreating(true);
    let local = getTempUser();
    const displayName = local?.name || "Demo Host";
    if (!local) {
      local = createTempUser(displayName);
      setTempUser(local);
    }

    try {
      const guest = await createGuestMutation.mutateAsync({
        displayName,
        avatarUrl: local.avatarUrl ?? null,
      });
      const hostProfileId = guest.profile.id;

      const DEMO_QUESTIONS = [
        {
          text: "What is the speed of light?",
          explanation: "The speed of light in a vacuum is exactly 299,792,458 meters per second (about 300,000 km/s).",
          points: 1,
          options: [
            { text: "299,792 km/s", isCorrect: true },
            { text: "150,000 km/s", isCorrect: false },
            { text: "450,000 km/s", isCorrect: false },
            { text: "500,000 km/s", isCorrect: false },
          ],
        },
        {
          text: "Which of the following is NOT a programming language?",
          explanation: "HTML is a markup language, not a programming language.",
          points: 1,
          options: [
            { text: "Python", isCorrect: false },
            { text: "TypeScript", isCorrect: false },
            { text: "HTML", isCorrect: true },
            { text: "Rust", isCorrect: false },
          ],
        },
        {
          text: "What does CPU stand for?",
          explanation: "CPU stands for Central Processing Unit.",
          points: 2,
          options: [
            { text: "Central Processing Unit", isCorrect: true },
            { text: "Computer Personal Unit", isCorrect: false },
            { text: "Central Power Unit", isCorrect: false },
            { text: "Control Processing Utility", isCorrect: false },
          ],
        },
      ];

      const results = await Promise.all(
        DEMO_QUESTIONS.map(async (q) => {
          const result = await createQuestionMutation.mutateAsync({
            createdById: hostProfileId,
            text: q.text,
            explanation: q.explanation,
            options: q.options,
          });
          const questionId = (result.question as { id: string }).id;
          return { questionId, points: q.points };
        })
      );
      const createdQuestions = results;

      const room = await createRoomMutation.mutateAsync({
        hostProfileId,
        questions: createdQuestions,
      });

      updateTempUser({ profileId: hostProfileId });
      navigate(`/dashboard/session/${room.room.code}`);
      setIsDemoCreating(false);
    } catch (err) {
      console.error("Failed to create demo room:", err);
      alert("Failed to create demo room: " + (err instanceof Error ? err.message : String(err)));
      setIsDemoCreating(false);
    }
  }

  const [codeHint] = useState(() => randomCodeHint());

  // ── QR Scanner state ──────────────────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);

  function handleScan(text: string) {
    let sessionCode = text.trim();
    const urlMatch = sessionCode.match(/\/dashboard\/session\/([A-Z0-9]+)/i);
    if (urlMatch && urlMatch[1]) {
      sessionCode = urlMatch[1].toUpperCase();
    } else {
      sessionCode = sessionCode.replace(/\s+/g, "").toUpperCase();
    }
    setShowScanner(false);
    navigate(`/dashboard/session/${sessionCode}`);
  }

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
              type="button"
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
              type="button"
              onClick={() => navigate("/dashboard/create")}
              className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface-soft"
            >
              Create a room
            </button>
            <button
              type="button"
              onClick={handleCreateDemoRoom}
              disabled={isDemoCreating}
              className="rounded-full bg-brand-100 hover:bg-brand-200 border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 transition disabled:opacity-50"
            >
              {isDemoCreating ? "Creating Demo..." : "Create Demo Room (Fast Test)"}
            </button>
          </div>
        </section>

      {/* ── QR Code Scanner Section ── */}
      <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-indigo-50 via-brand-50 to-violet-50 p-7 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-md">
              📷
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink">Scan QR Code to Join</h2>
              <p className="mt-1 text-sm text-muted">
                Ask the host to show their QR code. Point your camera at it to jump straight into their lobby instantly.
              </p>
            </div>
          </div>
          {!showScanner ? (
            <button
              type="button"
              id="start-qr-scanner-btn"
              onClick={() => setShowScanner(true)}
              className="flex-none inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 hover:shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm3 3h1v1h-1zm-3 8h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2zm-2-2h2v2h-2z"/>
              </svg>
              Open Camera Scanner
            </button>
          ) : (
            <button
              type="button"
              id="stop-qr-scanner-btn"
              onClick={() => setShowScanner(false)}
              className="flex-none inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
            >
              ✕ Close Scanner
            </button>
          )}
        </div>

        {/* Mount/unmount the scanner — html5-qrcode starts/stops camera via useEffect */}
        {showScanner && (
          <QrScannerView
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
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
                type="button"
                onClick={() => setShowNameModal(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTempUser}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Save and join
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
