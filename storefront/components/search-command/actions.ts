"use server";

import { getProducts } from "lib/medusa";
import { Product } from "lib/types";

export async function searchProducts(
  query: string,
): Promise<{ results: Product[]; totalCount: number }> {
  try {
    const products = await getProducts({
      query,
      sortKey: "RELEVANCE",
      reverse: false,
      limit: 8,
    });
    return {
      results: products,
      totalCount: products.length,
    };
  } catch (error) {
    console.error("Search error:", error);
    return { results: [], totalCount: 0 };
  }
}
