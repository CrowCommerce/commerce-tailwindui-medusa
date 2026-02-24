import { getAuthHeaders } from "lib/medusa/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const headers = await getAuthHeaders();
  const formData = await req.formData();

  const baseUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  const res = await fetch(`${baseUrl}/store/reviews/uploads`, {
    method: "POST",
    headers: {
      ...headers,
      ...(publishableKey && { "x-publishable-api-key": publishableKey }),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || `Upload failed (${res.status})` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
