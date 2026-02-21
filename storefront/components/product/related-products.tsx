"use client";

import { addItem } from "components/cart/actions";
import { useCart } from "components/cart/cart-context";
import type { Product } from "lib/types";
import type { TailwindRelatedProduct } from "lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

interface RelatedProductsProps {
  products: TailwindRelatedProduct[];
  fullProducts: Product[];
}

export default function RelatedProducts({
  products,
  fullProducts,
}: RelatedProductsProps) {
  if (!products || products.length === 0) return null;
  const { addCartItem } = useCart();
  const [message, formAction] = useActionState(addItem, null);

  return (
    <section
      aria-labelledby="related-heading"
      className="mx-auto max-w-7xl mt-10 border-t border-gray-200 px-4 py-16"
    >
      <h2
        id="related-heading"
        className="px-4 sm:px-6 text-xl font-bold text-gray-900"
      >
        Customers also bought
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
        {products.map((product, index) => {
          const fullProduct = fullProducts[index];
          if (!fullProduct) return null;

          const addItemAction = formAction.bind(null, product.variantId);

          return (
            <div key={product.id} className="flex h-full flex-col">
              <Link href={product.href} className="block group">
                <div className="relative h-72 w-full overflow-hidden rounded-lg">
                  <Image
                    alt={product.imageAlt}
                    src={product.imageSrc}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex h-72 items-end justify-end rounded-lg p-4">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black to-transparent opacity-50"
                    />
                    <p className="relative text-lg font-semibold text-white">
                      {product.price}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    {product.name}
                  </h3>
                  {product.color && (
                    <p className="mt-1 text-sm text-gray-500">
                      {product.color}
                    </p>
                  )}
                </div>
              </Link>
              <div className="mt-auto pt-6">
                <form
                  action={async () => {
                    const variant = fullProduct.variants.find(
                      (v) => v.id === product.variantId,
                    )!;
                    addCartItem(variant, fullProduct);
                    addItemAction();
                  }}
                >
                  <button
                    type="submit"
                    className="cursor-pointer relative flex w-full items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                  >
                    Add to bag<span className="sr-only">, {product.name}</span>
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
