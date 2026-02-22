import ProductGridPrice from "components/price/product-grid-price";
import { WishlistButton } from "components/wishlist/wishlist-button";
import { Product } from "lib/types";
import Image from "next/image";
import Link from "next/link";

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
      {products.map((product) => (
        <div key={product.id} className="group animate-fadeIn">
          <div className="relative">
            <Link
              href={`/product/${product.handle}`}
              prefetch={true}
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
                <Image
                  alt={product.featuredImage?.altText || product.title}
                  src={
                    product.featuredImage?.url || "https://via.placeholder.com/400"
                  }
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-300 ease-in-out group-hover:scale-105"
                />
              </div>
            </Link>
            <div className="absolute right-2 top-2 z-10">
              <WishlistButton
                variantId={product.variants?.[0]?.id ?? ""}
                size="sm"
                className="bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white"
              />
            </div>
          </div>
          <Link href={`/product/${product.handle}`} prefetch={true}>
            <h3 className="mt-4 text-sm text-gray-700">{product.title}</h3>
            <ProductGridPrice
              amount={product.priceRange.maxVariantPrice.amount}
              currencyCode={product.priceRange.maxVariantPrice.currencyCode}
            />
          </Link>
        </div>
      ))}
    </div>
  );
}
