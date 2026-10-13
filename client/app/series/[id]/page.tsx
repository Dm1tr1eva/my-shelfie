import type { Metadata } from "next";
import { SeriesPage } from "@/components/series-page";

export const metadata: Metadata = {
  title: "Series",
};

export default async function SeriesRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SeriesPage id={id} />;
}
