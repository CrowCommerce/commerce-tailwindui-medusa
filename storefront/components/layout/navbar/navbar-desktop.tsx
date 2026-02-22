"use client";

import {
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from "@headlessui/react";
import { Navigation } from "lib/types";
import Link from "next/link";

export function NavbarDesktop({ navigation }: { navigation: Navigation }) {
  return (
    <PopoverGroup className="hidden max-lg:pointer-events-none lg:block lg:flex-1 lg:self-stretch">
      <div className="flex h-full space-x-8">
        {navigation.categories.map((category, categoryIdx) => (
          <Popover key={category.name} className="flex">
            <div className="relative flex">
              <PopoverButton className="group focus-visible:outline-primary-600 data-open:text-primary-600 relative flex items-center justify-center text-sm font-medium text-gray-700 transition-colors duration-200 ease-out hover:text-gray-800 focus-visible:outline-2">
                {category.name}
                <span
                  aria-hidden="true"
                  className="group-data-open:bg-primary-600 absolute inset-x-0 -bottom-px z-30 h-0.5 transition duration-200 ease-out"
                />
              </PopoverButton>
            </div>
            <PopoverPanel
              transition
              className="absolute inset-x-0 top-full z-20 w-full bg-white text-sm text-gray-500 transition data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 top-1/2 bg-white shadow-sm"
              />
              <div className="relative bg-white">
                <div className="mx-auto max-w-7xl px-8">
                  <div className="grid grid-cols-2 items-start gap-x-8 gap-y-10 pt-10 pb-12">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                      <div>
                        <p
                          id={`desktop-featured-heading-${categoryIdx}`}
                          className="font-medium text-gray-900"
                        >
                          Featured
                        </p>
                        <ul
                          role="list"
                          aria-labelledby={`desktop-featured-heading-${categoryIdx}`}
                          className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                        >
                          {category.featured.map((item) => (
                            <li key={item.name} className="flex">
                              <Link
                                prefetch={true}
                                href={item.href}
                                className="hover:text-gray-800"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p
                          id="desktop-categories-heading"
                          className="font-medium text-gray-900"
                        >
                          Categories
                        </p>
                        <ul
                          role="list"
                          aria-labelledby="desktop-categories-heading"
                          className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                        >
                          {category.categories.map((item) => (
                            <li key={item.name} className="flex">
                              <Link
                                prefetch={true}
                                href={item.href}
                                className="hover:text-gray-800"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                      <div>
                        <p
                          id="desktop-collection-heading"
                          className="font-medium text-gray-900"
                        >
                          Collection
                        </p>
                        <ul
                          role="list"
                          aria-labelledby="desktop-collection-heading"
                          className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                        >
                          {category.collection.map((item) => (
                            <li key={item.name} className="flex">
                              <Link
                                prefetch={true}
                                href={item.href}
                                className="hover:text-gray-800"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p
                          id="desktop-brand-heading"
                          className="font-medium text-gray-900"
                        >
                          Brands
                        </p>
                        <ul
                          role="list"
                          aria-labelledby="desktop-brand-heading"
                          className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                        >
                          {category.brands.map((item) => (
                            <li key={item.name} className="flex">
                              <Link
                                prefetch={true}
                                href={item.href}
                                className="hover:text-gray-800"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverPanel>
          </Popover>
        ))}
        {navigation.pages.map((page) => (
          <Link
            key={page.name}
            href={page.href}
            prefetch={true}
            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800"
          >
            {page.name}
          </Link>
        ))}
      </div>
    </PopoverGroup>
  );
}
