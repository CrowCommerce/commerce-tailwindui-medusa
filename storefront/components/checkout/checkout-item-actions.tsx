"use client";

import { removeItem } from "components/cart/actions";
import { useActionState } from "react";

export function RemoveItemButton({ lineItemId }: { lineItemId: string }) {
  const [message, formAction, isPending] = useActionState(removeItem, null);

  return (
    <form action={() => formAction(lineItemId)}>
      <button
        type="submit"
        disabled={isPending}
        className="font-medium text-indigo-600 hover:text-indigo-500"
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </form>
  );
}
