import { getWishlistsDynamic } from "lib/medusa/wishlist";
import { WishlistPageClient } from "components/wishlist/wishlist-page-client";

export const metadata = {
  title: "Wishlist",
};

export default async function WishlistPage() {
  const wishlists = await getWishlistsDynamic();
  return <WishlistPageClient wishlists={wishlists} />;
}
