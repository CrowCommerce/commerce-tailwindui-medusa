import { Suspense } from "react";
import SortFilterMenu from "./sort-filter-menu";

export default function SortFilter() {
  return (
    <Suspense fallback={null}>
      <SortFilterMenu />
    </Suspense>
  );
}
