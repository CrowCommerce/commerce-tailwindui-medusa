import { NextRequest, NextResponse } from "next/server";
import { completeCart } from "lib/medusa/checkout";
import { getCartId } from "lib/medusa/cookies";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cartId: string }> },
) {
  const { cartId } = await params;
  const { searchParams } = req.nextUrl;
  const paymentIntent = searchParams.get("payment_intent");
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret",
  );
  const redirectStatus = searchParams.get("redirect_status") || "";

  const origin = req.nextUrl.origin;

  // Validate required params
  if (!paymentIntent || !paymentIntentClientSecret) {
    return NextResponse.redirect(
      `${origin}/checkout?error=missing_payment_params`,
    );
  }

  // Verify the cart belongs to the current session to prevent unauthorized completion
  const sessionCartId = await getCartId();
  if (!sessionCartId || sessionCartId !== cartId) {
    return NextResponse.redirect(
      `${origin}/checkout?error=invalid_session`,
    );
  }

  // Validate redirect status
  if (!["pending", "succeeded"].includes(redirectStatus)) {
    return NextResponse.redirect(`${origin}/checkout?error=payment_failed`);
  }

  // Complete the cart — Medusa validates payment status server-side with Stripe
  const result = await completeCart(cartId);

  if (result.type === "order") {
    return NextResponse.redirect(
      `${origin}/order/confirmed/${result.order.id}`,
    );
  }

  const errorMsg = encodeURIComponent(result.error || "payment_failed");
  return NextResponse.redirect(`${origin}/checkout?error=${errorMsg}`);
}
