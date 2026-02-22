import { getCollections } from "lib/medusa";
import { Suspense } from "react";
import MobileFilters from "./mobile-filters";

async function MobileFiltersList() {
  const collections = await getCollections();
  const collectionsWithLinks = collections.map((collection) => ({
    name: collection.title,
    href: collection.handle ? `/products/${collection.handle}` : "/products",
  }));

  return <MobileFilters collections={collectionsWithLinks} />;
}

export default function MobileFiltersWrapper() {
  return (
    <Suspense fallback={null}>
      <MobileFiltersList />
    </Suspense>
  );
}
