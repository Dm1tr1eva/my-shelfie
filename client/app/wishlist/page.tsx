import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return <Library tab="wishlist" />;
}
