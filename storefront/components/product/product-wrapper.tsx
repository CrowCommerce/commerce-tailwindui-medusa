"use client";

import type { Product } from "lib/types";
import type { TailwindProductDetail } from "lib/utils";
import { ProductDetail } from "./product-detail";

interface ProductWrapperProps {
  product: Product;
  transformedProduct: TailwindProductDetail;
}

export default function ProductWrapper({
  product,
  transformedProduct,
}: ProductWrapperProps) {
  return (
    <ProductDetail
      product={transformedProduct}
      sourceProduct={product}
      options={product.options}
      variants={product.variants}
    />
  );
}
