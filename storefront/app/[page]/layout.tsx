import Footer from "components/layout/footer";
import { Suspense } from "react";

const PageSkeleton = () => (
  <div className="animate-pulse">
    <div className="mb-8 h-12 w-3/4 rounded bg-gray-200" />
    <div className="mb-8 space-y-4">
      <div className="h-4 w-full rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-200" />
      <div className="h-4 w-5/6 rounded bg-gray-200" />
    </div>
    <div className="h-3 w-48 rounded bg-gray-200" />
  </div>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="w-full">
        <div className="mx-8 max-w-2xl py-20 sm:mx-auto">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
