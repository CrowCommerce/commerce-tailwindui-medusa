"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "./types";

interface TrendingProductsProps {
  products: Product[];
}

export default function TrendingProducts({ products }: TrendingProductsProps) {
  return (
    <section aria-labelledby="trending-heading" className="bg-neutral-200">
      <div className="py-16 sm:py-24 lg:mx-auto lg:max-w-7xl lg:px-8 lg:py-32">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0">
          <h2
            id="trending-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Trending products
          </h2>
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-primary-600 hover:text-primary-500 sm:block"
          >
            See everything
            <span aria-hidden="true"> &rarr;</span>
          </Link>
        </div>

        <div className="relative mt-8">
          <div className="relative w-full overflow-x-auto">
            <ul
              role="list"
              className="mx-4 inline-flex space-x-8 sm:mx-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:space-x-0"
            >
              {products.map((product) => (
                <li
                  key={product.id}
                  className="inline-flex w-64 flex-col text-center lg:w-auto"
                >
                  <div className="group relative">
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-gray-200">
                      <Image
                        alt={product.imageAlt}
                        src={product.imageSrc}
                        fill
                        sizes="(min-width: 1024px) 25vw, 256px"
                        className="object-cover group-hover:opacity-75"
                      />
                    </div>
                    <div className="mt-6">
                      <h3 className="mt-1 font-semibold text-gray-900">
                        <Link href={product.href}>
                          <span className="absolute inset-0" />
                          {product.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-gray-900">{product.price}</p>
                    </div>
                  </div>

                  <h4 className="sr-only">Available colors</h4>
                  <ul
                    role="list"
                    className="mt-auto flex items-center justify-center space-x-3 pt-6"
                  >
                    {product.availableColors.map((color) => (
                      <li
                        key={color.name}
                        style={{ backgroundColor: color.colorBg }}
                        className="size-4 rounded-full border border-black/10"
                      >
                        <span className="sr-only">{color.name}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 px-4 sm:hidden">
          <Link
            href="/products"
            className="text-sm font-semibold text-primary-600 hover:text-primary-500"
          >
            See everything
            <span aria-hidden="true"> &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
