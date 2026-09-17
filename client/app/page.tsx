"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    apiFetch<{ status: string }>("/api/health")
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return <div>Backend status: {status}</div>;
}
