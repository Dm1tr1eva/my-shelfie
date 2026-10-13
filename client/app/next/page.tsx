import type { Metadata } from "next";
import { NextToBuy } from "@/components/next-to-buy";

export const metadata: Metadata = {
  title: "Next to buy",
};

export default function NextPage() {
  return <NextToBuy />;
}
