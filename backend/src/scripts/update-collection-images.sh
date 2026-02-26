#!/usr/bin/env bash
#
# Updates collection metadata (image_url + description) on a running Medusa instance.
#
# Usage:
#   ./update-collection-images.sh [API_URL]
#
# Defaults to http://localhost:9000 if no URL is provided.
# Prompts for admin email and password.

set -euo pipefail

API_URL="${1:-http://localhost:9000}"

echo "Medusa API: $API_URL"
echo ""

# --- Authenticate ---
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password: " ADMIN_PASSWORD
echo ""

echo "Authenticating..."
TOKEN=$(curl -sf -X POST "$API_URL/auth/user/emailpass" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Authentication failed."
  exit 1
fi
echo "Authenticated."

# --- Fetch collections ---
echo "Fetching collections..."
COLLECTIONS_JSON=$(curl -sf "$API_URL/admin/collections?fields=id,handle,title,metadata" \
  -H "Authorization: Bearer $TOKEN")

# --- Define the image/description mapping ---
declare -A IMAGE_MAP
IMAGE_MAP[accessories]="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-category-01.jpg"
IMAGE_MAP[bags]="https://tailwindcss.com/plus-assets/img/ecommerce-images/category-page-01-featured-collection.jpg"
IMAGE_MAP[drinkware]="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-02-edition-03.jpg"
IMAGE_MAP[home-office]="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-02-edition-01.jpg"
IMAGE_MAP[stationery]="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-02-edition-02.jpg"
IMAGE_MAP[tops]="https://tailwindcss.com/plus-assets/img/ecommerce-images/home-page-03-featured-category.jpg"

declare -A DESC_MAP
DESC_MAP[accessories]="Caps, sunglasses, and everyday carry essentials"
DESC_MAP[bags]="Totes, satchels, and carry-all bags for every occasion"
DESC_MAP[drinkware]="Insulated bottles, tumblers, and mugs"
DESC_MAP[home-office]="Desk accessories and workspace organizers"
DESC_MAP[stationery]="Journals, pens, pencils, and sketchbooks"
DESC_MAP[tops]="Graphic tees and basic essentials"

# --- Update each collection ---
for HANDLE in accessories bags drinkware home-office stationery tops; do
  COLLECTION_ID=$(echo "$COLLECTIONS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data['collections']:
    if c['handle'] == '$HANDLE':
        print(c['id'])
        break
")

  if [ -z "$COLLECTION_ID" ]; then
    echo "WARNING: Collection '$HANDLE' not found, skipping."
    continue
  fi

  IMAGE_URL="${IMAGE_MAP[$HANDLE]}"
  DESCRIPTION="${DESC_MAP[$HANDLE]}"

  echo "Updating $HANDLE ($COLLECTION_ID)..."
  curl -sf -X POST "$API_URL/admin/collections/$COLLECTION_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"metadata\":{\"image_url\":\"$IMAGE_URL\",\"description\":\"$DESCRIPTION\"}}" \
    > /dev/null

  echo "  -> done"
done

echo ""
echo "All collections updated."
