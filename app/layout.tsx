import { GeistSans } from "geist/font/sans";
import { baseUrl } from "lib/utils";
import { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import "./globals.css";

import { CartProvider } from "components/cart/cart-context";
import Footer from "components/layout/footer";
import Navbar from "components/layout/navbar";
import { SearchDialog, SearchProvider } from "components/search-command";
import { getCart } from "lib/medusa";

const { SITE_NAME } = process.env;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: SITE_NAME!,
    template: `%s | ${SITE_NAME}`,
  },
  robots: {
    follow: true,
    index: true,
  },
};

async function AppProviders({ children }: { children: ReactNode }) {
  const cartPromise = getCart();

  return (
    <CartProvider cartPromise={cartPromise}>
      <SearchProvider>
        <SearchDialog />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </SearchProvider>
    </CartProvider>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="bg-neutral-50 ">
        <Suspense>
          <AppProviders>{children}</AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
