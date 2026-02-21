"use client";

import { useSearchParams } from "next/navigation";

export default function SearchHeader() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  return (
    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
      {query ? (
        <>
          Search results for{" "}
          <span className="text-primary-600">&quot;{query}&quot;</span>
        </>
      ) : (
        "Products"
      )}
    </h1>
  );
}
