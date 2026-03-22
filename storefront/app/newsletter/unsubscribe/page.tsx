import { sdk } from "lib/medusa"

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid Link</h1>
          <p className="mt-2 text-gray-500">
            This unsubscribe link is missing or malformed.
          </p>
        </div>
      </div>
    )
  }

  let success = false
  let errorMessage: string | null = null

  try {
    await sdk.client.fetch("/store/newsletter/unsubscribe", {
      method: "POST",
      body: { token },
    })
    success = true
  } catch (e) {
    errorMessage =
      e instanceof Error ? e.message : "Unable to process your request"
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        {success ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              You've been unsubscribed
            </h1>
            <p className="mt-2 text-gray-500">
              You won't receive any more newsletter emails from us.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-gray-500">
              {errorMessage?.includes("expired")
                ? "This unsubscribe link has expired. Please use the link in your most recent email."
                : "We couldn't process your request. Please try again or contact support."}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
