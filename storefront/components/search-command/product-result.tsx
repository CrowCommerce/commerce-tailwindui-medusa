import { Product } from "lib/types";
import Image from "next/image";
import { forwardRef, useEffect, useRef } from "react";

interface ProductResultProps {
  product: Product;
  active: boolean;
}

export const ProductResult = forwardRef<
  HTMLDivElement,
  ProductResultProps & React.HTMLAttributes<HTMLDivElement>
>(({ product, active, ...props }, ref) => {
  const price = parseFloat(product.priceRange.maxVariantPrice.amount);
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active item into view
  useEffect(() => {
    if (active && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [active]);

  // Combine refs
  const setRef = (node: HTMLDivElement | null) => {
    itemRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div
      ref={setRef}
      {...props}
      className={`flex cursor-pointer items-center rounded-lg px-3 py-2 select-none ${
        active
          ? "bg-primary-600 text-white"
          : "bg-gray-50 text-gray-900 hover:bg-gray-100"
      }`}
    >
      {/* Product image */}
      <div className="flex-none">
        <div
          className={`relative h-16 w-16 overflow-hidden rounded-md border ${
            active ? "border-primary-700" : "border-gray-300"
          }`}
        >
          {product.featuredImage ? (
            <Image
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center ${
                active ? "bg-primary-500" : "bg-gray-100"
              }`}
            >
              <span
                className={
                  active ? "text-primary-100 text-xs" : "text-xs text-gray-400"
                }
              >
                No image
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Product info */}
      <div className="ml-4 flex-auto">
        <p
          className={`text-sm font-medium ${active ? "text-white" : "text-gray-900"}`}
        >
          {product.title}
        </p>
        <p
          className={`text-sm ${active ? "text-primary-100" : "text-gray-500"}`}
        >
          ${price.toFixed(2)}
        </p>
      </div>

      {/* Arrow indicator */}
      {active && (
        <svg
          className="h-5 w-5 flex-none text-white"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
});

ProductResult.displayName = "ProductResult";
