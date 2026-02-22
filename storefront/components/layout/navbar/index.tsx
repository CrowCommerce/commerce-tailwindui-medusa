import { Suspense } from "react";
import { NavbarData } from "./navbar-data";
import { NavbarSkeleton } from "./navbar-skeleton";

export async function Navbar() {
  return (
    <Suspense fallback={<NavbarSkeleton />}>
      <NavbarData />
    </Suspense>
  );
}
