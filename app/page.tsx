"use cache";
import Collections from "components/home/collections";
import Hero from "components/home/hero";
import TrendingProducts from "components/home/trending-products";
import { getCollections, getProducts } from "lib/shopify";
import {
  transformCollectionToTailwind,
  transformProductToTailwind,
} from "lib/utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "High-performance ecommerce store built with Next.js, Vercel, and Shopify.",
  openGraph: {
    type: "website",
  },
};

export default async function HomePage() {
  // Fetch products from Shopify - most recent first
  const shopifyProducts = await getProducts({
    sortKey: "CREATED_AT",
    reverse: true,
  });

  // Transform and limit to 4 products for trending section
  const trendingProducts = shopifyProducts
    .slice(0, 4)
    .map(transformProductToTailwind);

  // Fetch collections from Shopify
  const shopifyCollections = await getCollections();

  // Transform and limit to 3 collections (skip the "All" collection at index 0)
  const collections = shopifyCollections
    .slice(1, 4)
    .map(transformCollectionToTailwind);

  return (
    <>
      <Hero />
      <TrendingProducts products={trendingProducts} />
      <Collections collections={collections} />
    </>
  );
}
