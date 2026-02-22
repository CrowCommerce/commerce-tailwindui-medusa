"use client";

import { Prose } from "components/template-prose";
import { Page } from "lib/types";
import { notFound } from "next/navigation";
import { use } from "react";

export function PageContent({ pagePromise }: { pagePromise: Promise<Page> }) {
  const page = use(pagePromise);

  if (!page) return notFound();

  return (
    <>
      <h1 className="mb-8 text-5xl font-bold">{page.title}</h1>
      <Prose className="mb-8" html={page.body} />
      <p className="text-sm italic">
        {`This document was last updated on ${new Intl.DateTimeFormat(
          undefined,
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          },
        ).format(new Date(page.updatedAt))}.`}
      </p>
    </>
  );
}
