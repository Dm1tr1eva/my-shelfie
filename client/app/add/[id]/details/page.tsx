import type { Metadata } from "next";
import { Suspense } from "react";
import { AddDetails } from "@/components/add-details";

export const metadata: Metadata = {
  title: "Add details",
};

export default async function AddDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense>
      <AddDetails id={id} />
    </Suspense>
  );
}
