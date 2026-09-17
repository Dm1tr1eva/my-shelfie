"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// A stub proving the auth flow end-to-end. The book list (Stage 5's real
// content) replaces this in the next PR.
export default function DashboardPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    // Covers "loading" (session check in flight) and "anonymous" (the
    // redirect above is about to fire) with the same empty state — there is
    // nothing meaningful to render in either case, and the server API
    // enforces auth regardless of what this page shows.
    return null;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
      <button onClick={handleLogout} className="w-fit rounded border px-4 py-2">
        Log out
      </button>
    </main>
  );
}
