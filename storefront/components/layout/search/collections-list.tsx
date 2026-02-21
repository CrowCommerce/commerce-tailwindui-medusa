"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CollectionsList({
  collections,
}: {
  collections: Array<{ name: string; href: string }>;
}) {
  const pathname = usePathname();

  return (
    <>
      <h3 className="sr-only">Collections</h3>
      <ul
        role="list"
        className="space-y-4 border-b border-gray-200 pb-6 text-sm font-medium text-gray-900"
      >
        {collections.map((collection) => {
          const isActive = pathname === collection.href;
          const DynamicTag = isActive ? "p" : Link;

          return (
            <li key={collection.name}>
              <DynamicTag
                href={collection.href}
                className={
                  isActive ? "font-medium underline underline-offset-4" : ""
                }
              >
                {collection.name}
              </DynamicTag>
            </li>
          );
        })}
      </ul>
    </>
  );
}
