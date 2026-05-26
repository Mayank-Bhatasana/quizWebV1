export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="border-b border-line bg-surface-soft">
        <div className="mx-auto flex h-10 max-w-6xl items-center justify-end gap-2 px-4 text-sm sm:px-6">
          <span className="text-muted">Taking a quiz?</span>
          <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">
            Join as participant →
          </a>
        </div>
      </div>

      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <svg className="h-4 w-4 text-white" viewBox="0 0 448 512" fill="currentColor" aria-hidden>
              <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm64 192c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V256c0-17.7 14.3-32 32-32zm64-64c0-17.7 14.3-32 32-32s32 14.3 32 32V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V160zM320 288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V320c0-17.7 14.3-32 32-32z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-ink">QuizHub</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted hover:text-ink">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted hover:text-ink">
            How it works
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted hover:text-ink">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#signup"
            className="hidden text-sm font-semibold text-muted hover:text-ink sm:inline"
          >
            Log in
          </a>
          <a
            href="#signup"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Sign up free
          </a>
        </div>
      </nav>
    </header>
  );
}
