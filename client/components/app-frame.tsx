"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AuthLoading } from "@/components/auth-loading";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/tab-bar";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_PATHS = ["/", "/login", "/register", "/privacy"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const signedIn = status === "authenticated";
  const waiting = status === "loading" && !PUBLIC_PATHS.includes(pathname);

  return (
    <>
      {signedIn ? <AppNav /> : <PublicHeader showSignIn={status === "anonymous"} />}
      <div
        className={`flex flex-1 flex-col ${signedIn ? "pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
      >
        {waiting ? <AuthLoading /> : children}
        <SiteFooter />
      </div>
      {signedIn && <TabBar />}
    </>
  );
}
