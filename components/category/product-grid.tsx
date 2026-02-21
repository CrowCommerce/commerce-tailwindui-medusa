import Image from "next/image";
import Link from "next/link";
import type { CategoryProduct } from "./types";

interface ProductGridProps {
  products: CategoryProduct[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:col-span-3 lg:gap-x-8">
      {products.map((product) => (
        <Link key={product.id} href={product.href} className="group text-sm">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
              alt={product.imageAlt}
              src={product.imageSrc}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover group-hover:opacity-75"
            />
          </div>
          <h3 className="mt-4 font-medium text-gray-900">{product.name}</h3>
          <p className="text-gray-500 italic">{product.availability}</p>
          <p className="mt-2 font-medium text-gray-900">{product.price}</p>
        </Link>
      ))}
    </div>
  );
}
