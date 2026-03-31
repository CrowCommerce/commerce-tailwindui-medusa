import { rootMetadata } from "lib/metadata";
import { describe, expect, it } from "vitest";

describe("root metadata", () => {
  it("provides default open graph metadata for non-product pages", () => {
    expect(rootMetadata.openGraph).toMatchObject({
      type: "website",
      title: "CrowCommerce",
      description:
        "High-performance ecommerce store built with Next.js, Vercel, and Medusa.",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
        },
      ],
    });
  });

  it("provides a default summary large image twitter card", () => {
    expect(rootMetadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "CrowCommerce",
      description:
        "High-performance ecommerce store built with Next.js, Vercel, and Medusa.",
      images: ["/opengraph-image"],
    });
  });
});
