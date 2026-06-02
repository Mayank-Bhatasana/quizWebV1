import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

type LeaderboardEntry = {
  id: string;
  name: string;
  avatar: string;
  avatarBg: string;
  score: number;
  correct: number;
  total: number;
  timeSeconds: number;
};

type MotionKind = "overtook" | "overtaken";

type TakeoverBanner = {
  climber: string;
  target: string;
};

const DUMMY_LEADERBOARD: LeaderboardEntry[] = [
  { id: "1", name: "Priya Sharma", avatar: "🎯", avatarBg: "bg-violet-200", score: 980, correct: 10, total: 10, timeSeconds: 142 },
  { id: "2", name: "Alex Rivera", avatar: "⚡", avatarBg: "bg-sky-200", score: 940, correct: 9, total: 10, timeSeconds: 156 },
  { id: "3", name: "Jordan Lee", avatar: "🧠", avatarBg: "bg-emerald-200", score: 910, correct: 9, total: 10, timeSeconds: 168 },
  { id: "4", name: "Sam Okonkwo", avatar: "🔥", avatarBg: "bg-orange-200", score: 870, correct: 8, total: 10, timeSeconds: 175 },
  { id: "5", name: "Mia Chen", avatar: "✨", avatarBg: "bg-pink-200", score: 840, correct: 8, total: 10, timeSeconds: 182 },
  { id: "6", name: "Chris Patel", avatar: "🎮", avatarBg: "bg-indigo-200", score: 810, correct: 8, total: 10, timeSeconds: 190 },
  { id: "7", name: "Taylor Brooks", avatar: "🚀", avatarBg: "bg-cyan-200", score: 780, correct: 7, total: 10, timeSeconds: 198 },
  { id: "8", name: "Riley Nguyen", avatar: "📚", avatarBg: "bg-amber-200", score: 750, correct: 7, total: 10, timeSeconds: 205 },
  { id: "9", name: "Casey Morgan", avatar: "🎨", avatarBg: "bg-rose-200", score: 720, correct: 7, total: 10, timeSeconds: 214 },
  { id: "10", name: "Jamie Wright", avatar: "🌟", avatarBg: "bg-lime-200", score: 690, correct: 6, total: 10, timeSeconds: 221 },
  { id: "11", name: "Dana Kim", avatar: "💡", avatarBg: "bg-teal-200", score: 660, correct: 6, total: 10, timeSeconds: 230 },
];

const MAX_VISIBLE = 10;
const LIVE_TICK_MS = 3800;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function codeFromParam(input: string | undefined) {
  return (input ?? "").trim().replace(/\s+/g, "").toUpperCase() || "DEMO";
}

function sortEntries(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
}

function captureFlipRects(root: HTMLElement | null) {
  const map = new Map<string, DOMRect>();
  if (!root) return map;

  root.querySelectorAll("[data-flip-id]").forEach((node) => {
    const id = node.getAttribute("data-flip-id");
    if (id) map.set(id, node.getBoundingClientRect());
  });

  return map;
}

function playFlipAnimations(root: HTMLElement | null, firstRects: Map<string, DOMRect>) {
  if (!root || firstRects.size === 0) return;

  root.querySelectorAll("[data-flip-id]").forEach((node) => {
    const id = node.getAttribute("data-flip-id");
    if (!id) return;

    const first = firstRects.get(id);
    if (!first) return;

    const el = node as HTMLElement;
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = "transform 0s";
    el.style.zIndex = "30";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.95s cubic-bezier(0.34, 1.12, 0.64, 1)";
        el.style.transform = "";

        const cleanup = () => {
          el.style.transition = "";
          el.style.zIndex = "";
          el.removeEventListener("transitionend", cleanup);
        };

        el.addEventListener("transitionend", cleanup);
      });
    });
  });
}

function simulateTakeover(pool: LeaderboardEntry[]) {
  const visible = sortEntries(pool).slice(0, MAX_VISIBLE);
  if (visible.length < 2) return null;

  const climbFromIndex = Math.floor(Math.random() * Math.min(6, visible.length - 1)) + 1;
  const climber = visible[climbFromIndex];
  const target = visible[climbFromIndex - 1];
  const scoreBump = 8 + Math.floor(Math.random() * 28);

  const nextPool = pool.map((entry) => {
    if (entry.id !== climber.id) return entry;

    const nextCorrect =
      entry.correct < entry.total && Math.random() > 0.35 ? entry.correct + 1 : entry.correct;

    return {
      ...entry,
      score: target.score + scoreBump,
      correct: nextCorrect,
      timeSeconds: Math.max(90, entry.timeSeconds - Math.floor(Math.random() * 8)),
    };
  });

  return {
    nextPool,
    overtookId: climber.id,
    overtakenId: target.id,
    banner: { climber: climber.name, target: target.name },
  };
}

function CrownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.5 19h19v2h-19v-2Zm2.2-2h14.6l1.2-8.4-4.1 3.1-3.3-5.8-3.3 5.8-4.1-3.1 1.2 8.4Zm4.8-10.2 2.1 3.7 3.4-2.6-1.4 4.9h-8.2l-1.4-4.9 3.4 2.6 2.1-3.7Z" />
    </svg>
  );
}

type PodiumPlace = 1 | 2 | 3;

const podiumConfig: Record<
  PodiumPlace,
  {
    order: string;
    pedestal: string;
    ring: string;
    badge: string;
    badgeText: string;
    avatar: string;
    label: string;
    glow: string;
  }
> = {
  1: {
    order: "order-2",
    pedestal: "h-36 bg-linear-to-t from-amber-500 to-amber-300 shadow-[0_8px_32px_-8px_rgb(245_158_11/0.55)]",
    ring: "ring-4 ring-amber-300/80 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-amber-400 to-yellow-300 text-amber-950",
    badgeText: "1st",
    avatar: "h-20 w-20 text-3xl",
    label: "Champion",
    glow: "bg-amber-400/25",
  },
  2: {
    order: "order-1",
    pedestal: "h-28 bg-linear-to-t from-slate-400 to-slate-300 shadow-[0_8px_24px_-8px_rgb(100_116_139/0.45)]",
    ring: "ring-4 ring-slate-300/80 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-slate-400 to-slate-300 text-slate-900",
    badgeText: "2nd",
    avatar: "h-16 w-16 text-2xl",
    label: "Runner-up",
    glow: "bg-slate-400/20",
  },
  3: {
    order: "order-3",
    pedestal: "h-24 bg-linear-to-t from-orange-600 to-orange-400 shadow-[0_8px_24px_-8px_rgb(234_88_12/0.45)]",
    ring: "ring-4 ring-orange-300/70 ring-offset-2 ring-offset-white",
    badge: "bg-linear-to-r from-orange-500 to-orange-400 text-orange-950",
    badgeText: "3rd",
    avatar: "h-16 w-16 text-2xl",
    label: "Third place",
    glow: "bg-orange-400/20",
  },
};

function FlipShell({
  id,
  motion,
  className = "",
  children,
}: {
  id: string;
  motion?: MotionKind;
  className?: string;
  children: React.ReactNode;
}) {
  const motionClass =
    motion === "overtook"
      ? "leaderboard-overtook"
      : motion === "overtaken"
        ? "leaderboard-overtaken"
        : "";

  return (
    <div data-flip-id={id} className={`leaderboard-flip-item ${className}`}>
      <div className={motionClass}>{children}</div>
    </div>
  );
}

function PodiumSpot({
  place,
  entry,
  motion,
}: {
  place: PodiumPlace;
  entry: LeaderboardEntry;
  motion?: MotionKind;
}) {
  const config = podiumConfig[place];

  return (
    <FlipShell id={entry.id} motion={motion} className={`flex flex-1 flex-col items-center ${config.order}`}>
      <div className="relative mb-3 flex w-full flex-col items-center">
        {place === 1 ? (
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <CrownIcon />
          </div>
        ) : (
          <div className="mb-1 h-8" aria-hidden />
        )}

        <div className={`absolute -inset-4 rounded-full blur-2xl ${config.glow}`} aria-hidden />

        <div
          className={`relative flex items-center justify-center rounded-full ${config.avatar} ${config.ring} ${entry.avatarBg}`}
        >
          <span aria-hidden>{entry.avatar}</span>
        </div>

        <span
          className={`absolute -bottom-2 rounded-full px-2.5 py-0.5 text-[0.65rem] font-extrabold tracking-wide uppercase ${config.badge}`}
        >
          {config.badgeText}
        </span>
      </div>

      <p className="mt-4 max-w-[7.5rem] truncate text-center text-sm font-bold text-ink">{entry.name}</p>
      <p className="leaderboard-score mt-0.5 text-lg font-extrabold tracking-tight text-ink">
        {entry.score.toLocaleString()}
      </p>
      <p className="text-[0.65rem] font-medium text-muted">
        {entry.correct}/{entry.total} · {formatTime(entry.timeSeconds)}
      </p>

      <div className={`mt-4 w-full max-w-[8.5rem] rounded-t-2xl ${config.pedestal}`}>
        <p className="pt-3 text-center text-[0.6rem] font-bold tracking-[0.18em] text-white/90 uppercase">
          {config.label}
        </p>
      </div>
    </FlipShell>
  );
}

function LeaderboardRow({
  entry,
  rank,
  motion,
}: {
  entry: LeaderboardEntry;
  rank: number;
  motion?: MotionKind;
}) {
  return (
    <FlipShell id={entry.id} motion={motion}>
      <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white px-4 py-3 shadow-sm sm:gap-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-sm font-extrabold text-muted">
          {rank}
        </span>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${entry.avatarBg}`}
          aria-hidden
        >
          {entry.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{entry.name}</p>
          <p className="text-xs text-muted">
            {entry.correct}/{entry.total} correct · {formatTime(entry.timeSeconds)}
          </p>
        </div>

        <div className="text-right">
          <p className="leaderboard-score text-base font-extrabold text-ink">{entry.score.toLocaleString()}</p>
          <p className="text-[0.65rem] font-semibold tracking-wide text-muted uppercase">pts</p>
        </div>
      </div>
    </FlipShell>
  );
}

export default function ShowExamLeaderBoard() {
  const params = useParams();
  const roomCode = codeFromParam(params.code);

  const [pool, setPool] = useState(() => sortEntries(DUMMY_LEADERBOARD));
  const [motion, setMotion] = useState<Record<string, MotionKind>>({});
  const [banner, setBanner] = useState<TakeoverBanner | null>(null);
  const [bannerTick, setBannerTick] = useState(0);

  const flipRootRef = useRef<HTMLDivElement>(null);
  const flipFirstRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const skipFlipRef = useRef(true);

  const visibleEntries = useMemo(() => sortEntries(pool).slice(0, MAX_VISIBLE), [pool]);

  const topThree = visibleEntries.slice(0, 3);
  const rest = visibleEntries.slice(3);

  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  useLayoutEffect(() => {
    if (skipFlipRef.current) {
      skipFlipRef.current = false;
      return;
    }

    playFlipAnimations(flipRootRef.current, flipFirstRectsRef.current);
    flipFirstRectsRef.current = new Map();
  }, [visibleEntries]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      flipFirstRectsRef.current = captureFlipRects(flipRootRef.current);

      setPool((prev) => {
        const result = simulateTakeover(prev);
        if (!result) return prev;

        setMotion({
          [result.overtookId]: "overtook",
          [result.overtakenId]: "overtaken",
        });
        setBanner(result.banner);
        setBannerTick((tick) => tick + 1);

        window.setTimeout(() => setMotion({}), 1100);

        return result.nextPool;
      });
    }, LIVE_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="leaderboard-enter flex w-full flex-col gap-8 pb-6">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live rankings
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">
          Room <span className="font-bold text-ink">{roomCode}</span> · General Knowledge Quiz
        </p>
        <p className="mt-1 text-xs text-muted">Top {MAX_VISIBLE} shown · scores update in real time</p>
      </header>

      <div
        role="status"
        aria-live="polite"
        className="leaderboard-takeover-banner mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm"
      >
        <span className="text-base" aria-hidden>
          ⚡
        </span>
        {banner ? (
          <div key={bannerTick} className="leaderboard-banner-content flex min-w-0 items-center justify-center gap-2">
            <span className="truncate">{banner.climber}</span>
            <span className="shrink-0 text-brand-600">overtook</span>
            <span className="truncate">{banner.target}</span>
          </div>
        ) : (
          <span className="text-brand-700/80">Watching for rank changes…</span>
        )}
      </div>

      <div ref={flipRootRef} className="grid gap-8">
        {first && second && third ? (
          <section
            aria-label="Top three players"
            className="rounded-3xl border border-line/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-8"
          >
            <div className="flex items-end justify-center gap-3 sm:gap-6">
              <PodiumSpot place={2} entry={second} motion={motion[second.id]} />
              <PodiumSpot place={1} entry={first} motion={motion[first.id]} />
              <PodiumSpot place={3} entry={third} motion={motion[third.id]} />
            </div>
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section aria-label="Remaining rankings">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold tracking-wide text-ink uppercase">Everyone else</h2>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                Ranks 4–{visibleEntries.length}
              </span>
            </div>

            <ol className="grid gap-2.5">
              {rest.map((entry, index) => (
                <li key={entry.id}>
                  <LeaderboardRow entry={entry} rank={index + 4} motion={motion[entry.id]} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <footer className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-center">
        <Link
          to={`/room/${roomCode}/join`}
          className="inline-flex rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
        >
          Back to quiz
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Go to dashboard
        </Link>
      </footer>
    </div>
  );
}
