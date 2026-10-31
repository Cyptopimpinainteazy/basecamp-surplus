"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-16 max-w-sm rounded-[var(--radius-tag)] bg-card p-8">
      <h1 className="display text-5xl">Sign in</h1>
      <label htmlFor="password" className="label mt-6">Admin password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className="field" autoFocus />
      {state?.error && <p className="mt-3 text-sm text-blaze-deep">{state.error}</p>}
      <button disabled={pending} className="btn btn-spruce mt-6 w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
