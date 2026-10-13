"use client";

import { AppNav } from "@/components/app-nav";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { TabBar } from "@/components/tab-bar";
import { useAuth } from "@/lib/auth-context";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <>
      {signedIn ? <AppNav /> : <PublicHeader showSignIn={status === "anonymous"} />}
      <div className={`flex flex-1 flex-col ${signedIn ? "pb-[100px] md:pb-0" : ""}`}>
        {children}
        <SiteFooter />
      </div>
      {signedIn && <TabBar />}
    </>
  );
}
