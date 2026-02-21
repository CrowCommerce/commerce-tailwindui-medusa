export default function CartPrice({
  amount,
  currencyCode,
  className,
}: {
  amount: string;
  currencyCode: string;
  className?: string;
}) {
  return (
    <p suppressHydrationWarning={true} className={className}>
      {new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      }).format(parseFloat(amount))}
    </p>
  );
}
