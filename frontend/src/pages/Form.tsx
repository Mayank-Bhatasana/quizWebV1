import { useState } from "react";

export default function Form() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("http://localhost:3000/sendForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, phone }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        setPassword("");
        setUsername("");
        setPhone("");
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "mt-1.5 block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15";

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="text-sm font-medium text-ink">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium text-ink">
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-6 w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : "Create account"}
      </button>

      {status === "success" && (
        <p className="mt-3 text-center text-sm font-medium text-green-700">
          Account created successfully.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-center text-sm text-red-600">
          Could not submit. Make sure the backend is running on port 3000.
        </p>
      )}
    </form>
  );
}
