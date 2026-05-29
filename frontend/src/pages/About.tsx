export default function About() {
  return (
    <div className="bg-white">
      <section className="border-b border-line bg-surface-soft">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
            About
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            A small quiz platform built for speed, clarity, and fun.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            This is a portfolio project where I explored building a modern UI,
            clean page layouts, and a simple product experience around creating
            and taking quizzes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
              UI-first
            </span>
            <span className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
              Responsive
            </span>
            <span className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
              Portfolio-ready
            </span>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">What it does</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Hosts can create quizzes, share them with participants, and view
                results. Participants join quickly and answer in a clean,
                distraction-free flow.
              </p>
            </article>

            <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">Why I built it</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                I wanted a realistic app to showcase routing, reusable layout
                components, and polished UI states—without overcomplicating the
                product.
              </p>
            </article>

            <article className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">What I learned</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Designing consistent spacing/typography, improving readability,
                and creating components that stay flexible as the app grows.
              </p>
            </article>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface-soft p-8">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-muted">
                Tech & tools
              </h3>
              <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
                <li className="rounded-xl border border-line bg-white px-4 py-3">
                  React + TypeScript
                </li>
                <li className="rounded-xl border border-line bg-white px-4 py-3">
                  Tailwind CSS
                </li>
                <li className="rounded-xl border border-line bg-white px-4 py-3">
                  Node js + Express js
                </li>
                <li className="rounded-xl border border-line bg-white px-4 py-3">
                  Prisma + PostgreSQL
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-8">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-muted">
                Links
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Want to chat or see more work? Reach out using the links below.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="mailto:bhatasanamayank06@gmail.com"
                  target="_blank"
                  className="inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Email me
                </a>
                <a
                  href="https://github.com/mayank-bhatasana/"
                  target="_blank"
                  className="inline-flex items-center rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
                >
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/mayank-bhatasana/"
                  target="_blank"
                  className="inline-flex items-center rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
                >
                  LinkedIn
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
