export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4 sm:px-6">
        <div className="sm:col-span-2">
          <a href="/" className="text-xl font-bold text-ink">
            QuizHub
          </a>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Create quizzes, share a link, and see results in real time—built for
            classrooms, teams, and events.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href="#features" className="hover:text-brand-600">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-brand-600">
                How it works
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-brand-600">
                Pricing
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href="#signup" className="hover:text-brand-600">
                Sign up
              </a>
            </li>
            <li>
              <a href="#signup" className="hover:text-brand-600">
                Log in
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6">
        <p className="text-center text-sm text-muted">
          © {new Date().getFullYear()} QuizHub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
