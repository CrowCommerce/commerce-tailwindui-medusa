"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Cart from "components/cart";
import { SearchButton } from "components/search-command";
import { Navigation } from "lib/types";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import NavbarDesktop from "./navbar-desktop";

export default function NavbarClient({
  navigation,
}: {
  navigation: Navigation;
}) {
  const [open, setOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Auto-close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  // Auto-close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        setOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle menu close and return focus
  const handleClose = (value: boolean) => {
    setOpen(value);
    if (!value) {
      // Return focus to hamburger button after menu closes
      setTimeout(() => {
        hamburgerButtonRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="bg-white">
      {/* Mobile menu - inlined from navbar-mobile */}
      <Dialog
        open={open}
        onClose={handleClose}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/25 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-50 flex">
          <DialogPanel
            id="mobile-menu"
            transition
            className="relative flex w-full max-w-xs transform flex-col overflow-y-auto bg-white pb-12 shadow-xl transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <div className="flex px-4 pt-5 pb-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-600"
                aria-label="Close menu"
                data-testid="close-mobile-menu"
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            {/* Links */}
            <TabGroup className="mt-2">
              <div className="border-b border-gray-200">
                <TabList className="-mb-px flex space-x-8 px-4">
                  {navigation.categories.map((category) => (
                    <Tab
                      key={category.name}
                      className="flex-1 border-b-2 border-transparent px-1 py-4 text-base font-medium whitespace-nowrap text-gray-900 data-selected:border-primary-600 data-selected:text-primary-600"
                    >
                      {category.name}
                    </Tab>
                  ))}
                </TabList>
              </div>
              <TabPanels>
                {navigation.categories.map((category, categoryIdx) => (
                  <TabPanel
                    key={category.name}
                    className="space-y-12 px-4 pt-10 pb-6"
                  >
                    <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-10">
                        <div>
                          <p
                            id={`mobile-featured-heading-${categoryIdx}`}
                            className="font-medium text-gray-900"
                          >
                            Featured
                          </p>
                          <ul
                            role="list"
                            aria-labelledby={`mobile-featured-heading-${categoryIdx}`}
                            className="mt-6 space-y-6"
                          >
                            {category.featured.map((item) => (
                              <li key={item.name} className="flex">
                                <Link
                                  prefetch={true}
                                  href={item.href}
                                  className="text-gray-500"
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p
                            id="mobile-categories-heading"
                            className="font-medium text-gray-900"
                          >
                            Categories
                          </p>
                          <ul
                            role="list"
                            aria-labelledby="mobile-categories-heading"
                            className="mt-6 space-y-6"
                          >
                            {category.categories.map((item) => (
                              <li key={item.name} className="flex">
                                <Link
                                  prefetch={true}
                                  href={item.href}
                                  className="text-gray-500"
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-x-6 gap-y-10">
                        <div>
                          <p
                            id="mobile-collection-heading"
                            className="font-medium text-gray-900"
                          >
                            Collection
                          </p>
                          <ul
                            role="list"
                            aria-labelledby="mobile-collection-heading"
                            className="mt-6 space-y-6"
                          >
                            {category.collection.map((item) => (
                              <li key={item.name} className="flex">
                                <Link
                                  prefetch={true}
                                  href={item.href}
                                  className="text-gray-500"
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p
                            id="mobile-brand-heading"
                            className="font-medium text-gray-900"
                          >
                            Brands
                          </p>
                          <ul
                            role="list"
                            aria-labelledby="mobile-brand-heading"
                            className="mt-6 space-y-6"
                          >
                            {category.brands.map((item) => (
                              <li key={item.name} className="flex">
                                <Link
                                  prefetch={true}
                                  href={item.href}
                                  className="text-gray-500"
                                >
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                ))}
              </TabPanels>
            </TabGroup>

            <div className="space-y-6 border-t border-gray-200 px-4 py-6">
              {navigation.pages.map((page) => (
                <div key={page.name} className="flow-root">
                  <Link
                    prefetch={true}
                    href={page.href}
                    className="-m-2 block p-2 font-medium text-gray-900"
                  >
                    {page.name}
                  </Link>
                </div>
              ))}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <header className="relative bg-white">
        <nav
          aria-label="Top"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="border-b border-gray-200">
            <div className="flex h-16 items-center justify-between">
              <div className="relative z-50 flex flex-1 items-center lg:hidden">
                <button
                  ref={hamburgerButtonRef}
                  type="button"
                  onClick={() => setOpen(true)}
                  className="relative z-10 -ml-2 min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer rounded-md bg-white p-2 text-gray-400 hover:text-gray-500 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                  aria-expanded={open}
                  aria-controls="mobile-menu"
                  aria-label="Open main menu"
                  data-testid="hamburger"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <span className="sr-only">Open menu</span>
                  <Bars3Icon aria-hidden="true" className="size-6" />
                </button>

                <SearchButton className="ml-2 rounded-md p-2 text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2" />
              </div>

              {/* Flyout menus */}
              <NavbarDesktop navigation={navigation} />

              {/* Logo */}
              <Link prefetch={true} href="/" className="flex">
                <span className="sr-only">Your Company</span>
                <img
                  alt=""
                  src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                  className="h-8 w-auto"
                />
              </Link>

              <div className="flex flex-1 items-center justify-end">
                {/* Search */}
                <SearchButton className="hidden rounded-md p-2 text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 lg:block" />

                {/* Account */}
                {/* <Link href="#" className="p-2 text-gray-400 hover:text-gray-500 lg:ml-4">
                <span className="sr-only">Account</span>
                <UserIcon aria-hidden="true" className="size-6" />
              </Link> */}

                {/* Cart */}
                <div className="ml-4 flow-root lg:ml-6">
                  <Suspense fallback={null}>
                    <Cart />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
}
