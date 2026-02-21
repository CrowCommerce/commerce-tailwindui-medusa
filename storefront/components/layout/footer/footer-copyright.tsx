"use client";

export default function FooterCopyright({
  companyName,
}: {
  companyName: string | undefined;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <p className="text-sm text-gray-500">
      &copy; {currentYear} {companyName} All rights reserved.
    </p>
  );
}
