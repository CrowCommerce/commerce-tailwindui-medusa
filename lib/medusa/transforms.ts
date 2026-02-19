import type { HttpTypes } from "@medusajs/types";
import type {
  Cart,
  CartItem,
  Collection,
  Image,
  Money,
  Product,
  ProductOption,
  ProductVariant,
} from "lib/types";

/**
 * Convert Medusa integer cents to Money string format.
 * Medusa stores amounts as integers (e.g., 2999 = $29.99).
 * Our internal types use string amounts (e.g., "29.99").
 */
function toMoney(
  amount: number | undefined | null,
  currencyCode: string,
): Money {
  return {
    amount: ((amount ?? 0) / 100).toFixed(2),
    currencyCode: currencyCode.toUpperCase(),
  };
}

function getCurrencyCode(product: HttpTypes.StoreProduct): string {
  const variant = product.variants?.[0];
  return (
    (variant as any)?.calculated_price?.currency_code || "USD"
  );
}

function transformImage(
  image: HttpTypes.StoreProductImage,
  fallbackAlt: string,
): Image {
  return {
    url: image.url || "",
    altText: fallbackAlt,
    width: 0,
    height: 0,
  };
}

function transformVariant(
  variant: HttpTypes.StoreProductVariant,
  currencyCode: string,
): ProductVariant {
  const calculatedPrice = (variant as any)?.calculated_price;
  const amount = calculatedPrice?.calculated_amount ?? 0;
  const inventoryQuantity = (variant as any)?.inventory_quantity ?? 0;
  const manageInventory = variant.manage_inventory ?? false;

  return {
    id: variant.id || "",
    title: variant.title || "",
    availableForSale: !manageInventory || inventoryQuantity > 0,
    selectedOptions: (variant.options || []).map((opt) => ({
      name: opt.option?.title || "",
      value: opt.value || "",
    })),
    price: toMoney(amount, currencyCode),
  };
}

function transformOption(
  option: HttpTypes.StoreProductOption,
): ProductOption {
  return {
    id: option.id || "",
    name: option.title || "",
    values: (option.values || []).map((v) => v.value || ""),
  };
}

export function transformProduct(
  product: HttpTypes.StoreProduct,
): Product {
  const currencyCode = getCurrencyCode(product);
  const variants = (product.variants || []).map((v) =>
    transformVariant(v, currencyCode),
  );
  const images = (product.images || []).map((img) =>
    transformImage(img, product.title || ""),
  );

  const prices = variants.map((v) => parseFloat(v.price.amount));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const featuredImage: Image = product.thumbnail
    ? {
        url: product.thumbnail,
        altText: product.title || "",
        width: 0,
        height: 0,
      }
    : images[0] || {
        url: "",
        altText: product.title || "",
        width: 0,
        height: 0,
      };

  const tags: string[] = (product.tags || []).map(
    (t) => (t as any).value || (t as any).name || String(t),
  );

  return {
    id: product.id || "",
    handle: product.handle || "",
    availableForSale: variants.some((v) => v.availableForSale),
    title: product.title || "",
    description: product.description || "",
    descriptionHtml: product.description || "",
    options: (product.options || []).map(transformOption),
    priceRange: {
      minVariantPrice: toMoney(minPrice * 100, currencyCode),
      maxVariantPrice: toMoney(maxPrice * 100, currencyCode),
    },
    variants,
    featuredImage,
    images,
    seo: {
      title:
        (product.metadata?.seo_title as string) || product.title || "",
      description:
        (product.metadata?.seo_description as string) ||
        product.description ||
        "",
    },
    tags,
    updatedAt: product.updated_at || new Date().toISOString(),
  };
}

export function transformCollection(
  collection: HttpTypes.StoreCollection,
): Collection {
  return {
    handle: collection.handle || "",
    title: collection.title || "",
    description:
      (collection.metadata?.description as string) || "",
    seo: {
      title:
        (collection.metadata?.seo_title as string) ||
        collection.title ||
        "",
      description:
        (collection.metadata?.seo_description as string) ||
        (collection.metadata?.description as string) ||
        "",
    },
    updatedAt: collection.updated_at || new Date().toISOString(),
    path: `/products/${collection.handle}`,
    image: collection.metadata?.image_url
      ? {
          url: collection.metadata.image_url as string,
          altText: collection.title || "",
          width: 0,
          height: 0,
        }
      : undefined,
  };
}

export function transformCart(cart: HttpTypes.StoreCart): Cart {
  const currencyCode = cart.currency_code || "USD";

  const lines: CartItem[] = (cart.items || []).map((item) => {
    const product = item.product;
    const variant = item.variant;

    return {
      id: item.id,
      quantity: item.quantity || 0,
      cost: {
        totalAmount: toMoney(item.total, currencyCode),
      },
      merchandise: {
        id: variant?.id || item.variant_id || "",
        title: variant?.title || item.title || "",
        selectedOptions: (variant?.options || []).map((opt) => ({
          name: opt.option?.title || "",
          value: opt.value || "",
        })),
        product: {
          id: product?.id || item.product_id || "",
          handle: product?.handle || "",
          title: product?.title || item.title || "",
          featuredImage: {
            url: item.thumbnail || product?.thumbnail || "",
            altText: product?.title || item.title || "",
            width: 0,
            height: 0,
          },
        },
      },
    };
  });

  return {
    id: cart.id,
    checkoutUrl: "",
    cost: {
      subtotalAmount: toMoney(cart.subtotal, currencyCode),
      totalAmount: toMoney(cart.total, currencyCode),
      totalTaxAmount: toMoney(cart.tax_total, currencyCode),
    },
    lines,
    totalQuantity: lines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    ),
  };
}
