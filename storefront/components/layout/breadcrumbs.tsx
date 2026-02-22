"use client";

import Link from "next/link";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-gray-700">
                  {item.name}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-gray-900" : ""}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.name}
                </span>
              )}
              {!isLast ? (
                <span className="mx-2 text-gray-300" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
