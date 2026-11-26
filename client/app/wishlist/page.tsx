import type { Metadata } from "next";
import { Suspense } from "react";
import { Wishlist } from "@/components/wishlist";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <Suspense>
      <Wishlist />
    </Suspense>
  );
}
