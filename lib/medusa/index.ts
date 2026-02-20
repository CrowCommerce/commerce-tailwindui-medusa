import Medusa from "@medusajs/js-sdk";
import type { HttpTypes } from "@medusajs/types";
import { HIDDEN_PRODUCT_TAG, TAGS } from "lib/constants";
import { DEFAULT_NAVIGATION } from "lib/constants/navigation";
import type {
  Cart,
  Collection,
  Menu,
  Navigation,
  Page,
  Product,
} from "lib/types";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders, getCartId, removeCartId, setCartId } from "./cookies";
import { medusaError } from "./error";
import {
  transformCart,
  transformCollection,
  transformProduct,
} from "./transforms";

// --- SDK Client ---

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: false,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

// --- Region Helper (single-region mode) ---

let cachedRegion: HttpTypes.StoreRegion | null = null;

async function getDefaultRegion(): Promise<HttpTypes.StoreRegion> {
  if (cachedRegion) return cachedRegion;

  const { regions } = await sdk.client.fetch<{
    regions: HttpTypes.StoreRegion[];
  }>("/store/regions", {
    method: "GET",
    cache: "force-cache",
  });

  if (!regions.length) {
    throw new Error("No regions found in Medusa. Create at least one region.");
  }

  cachedRegion = regions[0]!;
  return cachedRegion;
}

// --- Product Fields ---

const PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags";

const CART_FIELDS =
  "*items,*items.product,*items.variant,*items.thumbnail,+items.total,*promotions,+shipping_methods.name";

// --- Products ---

export async function getProduct(handle: string): Promise<Product | undefined> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const region = await getDefaultRegion();

  const { products } = await sdk.client.fetch<{
    products: HttpTypes.StoreProduct[];
  }>("/store/products", {
    method: "GET",
    query: {
      handle,
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      limit: 1,
    },
    cache: "force-cache",
  });

  const product = products[0];
  if (!product) return undefined;

  return transformProduct(product);
}

export async function getProducts({
  query,
  reverse,
  sortKey,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const region = await getDefaultRegion();

  let order: string | undefined;
  if (sortKey === "PRICE") {
    order = reverse
      ? "-variants.calculated_price.calculated_amount"
      : "variants.calculated_price.calculated_amount";
  } else if (sortKey === "CREATED_AT") {
    order = reverse ? "-created_at" : "created_at";
  } else if (sortKey === "BEST_SELLING") {
    order = "-created_at";
  }

  const fetchQuery: Record<string, any> = {
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 100,
  };

  if (query) fetchQuery.q = query;
  if (order) fetchQuery.order = order;

  const { products } = await sdk.client.fetch<{
    products: HttpTypes.StoreProduct[];
  }>("/store/products", {
    method: "GET",
    query: fetchQuery,
    cache: "force-cache",
  });

  return products
    .filter((p) => {
      const tags = (p.tags || []).map(
        (t: any) => t.value || t.name || String(t),
      );
      return !tags.includes(HIDDEN_PRODUCT_TAG);
    })
    .map(transformProduct);
}

// Placeholder: Medusa v2 has no recommendation engine. This returns the 4 most
// recent products (excluding the current one) as a "you might also like" section.
export async function getProductRecommendations(
  productId: string,
): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const region = await getDefaultRegion();

  const { products } = await sdk.client.fetch<{
    products: HttpTypes.StoreProduct[];
  }>("/store/products", {
    method: "GET",
    query: {
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      limit: 5,
      order: "-created_at",
    },
    cache: "force-cache",
  });

  return products
    .filter((p) => p.id !== productId)
    .slice(0, 4)
    .map(transformProduct);
}

// --- Collections ---

export async function getCollection(
  handle: string,
): Promise<Collection | undefined> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const { collections } = await sdk.client.fetch<{
    collections: HttpTypes.StoreCollection[];
  }>("/store/collections", {
    method: "GET",
    query: { handle, limit: 1 },
    cache: "force-cache",
  });

  const collection = collections[0];
  if (!collection) return undefined;

  return transformCollection(collection);
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.collections, TAGS.products);
  cacheLife("days");

  const { collections } = await sdk.client.fetch<{
    collections: HttpTypes.StoreCollection[];
  }>("/store/collections", {
    method: "GET",
    query: { handle: collection, fields: "*products", limit: 1 },
    cache: "force-cache",
  });

  const col = collections[0];
  if (!col) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  const region = await getDefaultRegion();

  let order: string | undefined;
  if (sortKey === "PRICE") {
    order = reverse
      ? "-variants.calculated_price.calculated_amount"
      : "variants.calculated_price.calculated_amount";
  } else if (sortKey === "CREATED_AT" || sortKey === "CREATED") {
    order = reverse ? "-created_at" : "created_at";
  }

  const fetchQuery: Record<string, any> = {
    collection_id: [col.id],
    region_id: region.id,
    fields: PRODUCT_FIELDS,
    limit: 100,
  };

  if (order) fetchQuery.order = order;

  const { products } = await sdk.client.fetch<{
    products: HttpTypes.StoreProduct[];
  }>("/store/products", {
    method: "GET",
    query: fetchQuery,
    cache: "force-cache",
  });

  return products
    .filter((p) => {
      const tags = (p.tags || []).map(
        (t: any) => t.value || t.name || String(t),
      );
      return !tags.includes(HIDDEN_PRODUCT_TAG);
    })
    .map(transformProduct);
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const { collections } = await sdk.client.fetch<{
    collections: HttpTypes.StoreCollection[];
  }>("/store/collections", {
    method: "GET",
    query: { limit: 100 },
    cache: "force-cache",
  });

  const allCollection: Collection = {
    handle: "",
    title: "All",
    description: "All products",
    seo: { title: "All", description: "All products" },
    path: "/products",
    updatedAt: new Date().toISOString(),
  };

  const transformed = collections
    .filter((c) => !c.handle?.startsWith("hidden"))
    .map(transformCollection);

  return [allCollection, ...transformed];
}

// --- Cart ---

/**
 * Fetch the current cart by ID with full line item details.
 * Shared by mutation functions that need to return the updated cart.
 */
async function fetchCart(cartId: string): Promise<Cart> {
  const headers = await getAuthHeaders();

  const { cart } = await sdk.client.fetch<{
    cart: HttpTypes.StoreCart;
  }>(`/store/carts/${cartId}`, {
    method: "GET",
    headers,
    query: { fields: CART_FIELDS },
  });

  return transformCart(cart);
}

async function requireCartId(context: string): Promise<string> {
  const cartId = await getCartId();
  if (!cartId) {
    throw new Error(`No cart ID found when ${context}`);
  }
  return cartId;
}

export async function createCart(): Promise<Cart> {
  const region = await getDefaultRegion();
  const headers = await getAuthHeaders();

  const { cart } = await sdk.store.cart.create(
    { region_id: region.id },
    {},
    headers,
  );

  await setCartId(cart.id);
  return transformCart(cart);
}

export async function getOrSetCart(): Promise<Cart> {
  const existingCartId = await getCartId();

  if (existingCartId) {
    const existing = await getCart();
    if (existing) return existing;
  }

  return createCart();
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const cartId = await requireCartId("adding to cart");
  const headers = await getAuthHeaders();

  for (const line of lines) {
    if (!line.merchandiseId) {
      throw new Error("Missing variant ID when adding to cart");
    }
    if (line.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    await sdk.store.cart
      .createLineItem(
        cartId,
        { variant_id: line.merchandiseId, quantity: line.quantity },
        {},
        headers,
      )
      .catch(medusaError);
  }

  return fetchCart(cartId);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = await requireCartId("removing item");
  const headers = await getAuthHeaders();

  for (const lineId of lineIds) {
    if (!lineId) {
      throw new Error("Missing line item ID when removing from cart");
    }

    await sdk.store.cart
      .deleteLineItem(cartId, lineId, {}, headers)
      .catch(medusaError);
  }

  return fetchCart(cartId);
}

export async function updateCart(
  lines: {
    id: string;
    merchandiseId: string;
    quantity: number;
  }[],
): Promise<Cart> {
  const cartId = await requireCartId("updating cart");
  const headers = await getAuthHeaders();

  for (const line of lines) {
    await sdk.store.cart
      .updateLineItem(cartId, line.id, { quantity: line.quantity }, {}, headers)
      .catch(medusaError);
  }

  return fetchCart(cartId);
}

export async function getCart(): Promise<Cart | undefined> {
  const cartId = await getCartId();
  if (!cartId) return undefined;

  try {
    return await fetchCart(cartId);
  } catch (error) {
    console.error(
      "[Cart] Failed to retrieve cart, clearing stale cookie:",
      error,
    );
    await removeCartId().catch(() => {});
    return undefined;
  }
}

// --- Navigation ---

export async function getNavigation(): Promise<Navigation> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  const collections = await getCollections();

  if (collections.length <= 1) {
    return DEFAULT_NAVIGATION;
  }

  const collectionLinks = collections
    .filter((c) => c.handle !== "")
    .map((c) => ({ name: c.title, href: c.path }));

  return {
    categories:
      DEFAULT_NAVIGATION.categories.length > 0
        ? DEFAULT_NAVIGATION.categories
        : [
            {
              name: "Shop",
              featured: collectionLinks.slice(0, 3),
              categories: collectionLinks,
              collection: collectionLinks,
              brands: [],
            },
          ],
    pages: DEFAULT_NAVIGATION.pages,
  };
}

export async function getMenu(handle: string): Promise<Menu[]> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("days");

  if (handle.includes("footer")) {
    const collections = await getCollections();
    return collections
      .filter((c) => c.handle !== "")
      .slice(0, 6)
      .map((c) => ({ title: c.title, path: c.path }));
  }

  return [];
}

// --- Pages ---

export async function getPage(handle: string): Promise<Page> {
  return {
    id: "",
    title: "",
    handle,
    body: "",
    bodySummary: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getPages(): Promise<Page[]> {
  return [];
}

// --- Webhook Revalidation ---

export async function revalidate(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    console.error("Invalid revalidation secret.");
    return NextResponse.json({ status: 401 });
  }

  revalidateTag(TAGS.collections, "max");
  revalidateTag(TAGS.products, "max");
  revalidateTag(TAGS.cart, "max");

  return NextResponse.json({
    status: 200,
    revalidated: true,
    now: Date.now(),
  });
}
