import { StarIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

export function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((index) => (
        <StarIcon
          key={index}
          aria-hidden="true"
          className={clsx(
            rating > index ? "text-yellow-400" : "text-gray-300",
            size === "sm" ? "size-5" : "size-6",
            "shrink-0",
          )}
        />
      ))}
    </div>
  );
}
