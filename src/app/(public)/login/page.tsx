"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { signIn } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-border">
      <div className="mb-6 text-center">
        <div className="text-4xl">🏠</div>
        <h1 className="mt-2 text-xl font-bold text-foreground">
          우리집 살림 매니저
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="이메일">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="input"
          />
        </Field>

        <Field label="비밀번호">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand hover:underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
