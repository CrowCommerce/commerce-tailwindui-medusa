import { siteBrand } from "@repo/site-config";
import type { Metadata } from "next";
import { DEFAULT_SITE_DESCRIPTION } from "lib/structured-data";
import { baseUrl } from "lib/utils";

const siteName = process.env.SITE_NAME?.trim() || siteBrand.siteName;

export const defaultSocialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${siteName} social preview`,
};

export const rootMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: DEFAULT_SITE_DESCRIPTION,
    url: baseUrl,
    images: [defaultSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [defaultSocialImage.url],
  },
  robots: {
    follow: true,
    index: true,
  },
};
