"use cache";
import { Collections } from "components/home/collections";
import { Hero } from "components/home/hero";
import { TrendingProducts } from "components/home/trending-products";
import { getCollections, getProducts } from "lib/medusa";
import {
  buildWebsiteJsonLd,
  buildOrganizationJsonLd,
  DEFAULT_SITE_DESCRIPTION,
  getSiteSchemaConfig,
  JsonLdScript,
} from "lib/structured-data";
import {
  transformCollectionToTailwind,
  transformProductToTailwind,
} from "lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description: DEFAULT_SITE_DESCRIPTION,
};

export default async function HomePage() {
  // Fetch products from Medusa - most recent first
  const allProducts = await getProducts({
    sortKey: "CREATED_AT",
    reverse: true,
    limit: 4,
  });

  // Transform and limit to 4 products for trending section
  const trendingProducts = allProducts
    .slice(0, 4)
    .map(transformProductToTailwind);

  // Fetch collections from Medusa
  const allCollections = await getCollections();

  // Transform and limit to 3 collections (skip the "All" collection at index 0)
  const collections = allCollections
    .slice(1, 4)
    .map(transformCollectionToTailwind);
  const siteSchemaConfig = getSiteSchemaConfig({
    description: DEFAULT_SITE_DESCRIPTION,
  });
  const organizationJsonLd = buildOrganizationJsonLd(siteSchemaConfig);
  const websiteJsonLd = buildWebsiteJsonLd(siteSchemaConfig);

  return (
    <>
      <JsonLdScript data={organizationJsonLd} />
      <JsonLdScript data={websiteJsonLd} />
      <Hero />
      <TrendingProducts products={trendingProducts} />
      <Collections collections={collections} />
    </>
  );
}
