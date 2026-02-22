export default function ProductGridPrice({
  amount,
  currencyCode,
}: {
  amount: string;
  currencyCode: string;
}) {
  return (
    <p
      suppressHydrationWarning={true}
      className="mt-1 text-lg font-medium text-gray-900"
    >
      {new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      }).format(parseFloat(amount))}
    </p>
  );
}
