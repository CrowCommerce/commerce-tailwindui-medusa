import { siteBrand } from "@repo/site-config";
import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { join } from "path";

export type Props = {
  title?: string;
};

export default async function OpengraphImage(
  props?: Props,
): Promise<ImageResponse> {
  const siteName = process.env.SITE_NAME?.trim() || siteBrand.siteName;
  const { title } = {
    ...{
      title: siteName,
    },
    ...props,
  };

  const file = await readFile(join(process.cwd(), "./fonts/Inter-Bold.ttf"));
  const font = Uint8Array.from(file).buffer;

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col justify-between bg-neutral-950 px-20 py-16 text-white"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(115,115,115,0.28), transparent 38%), linear-gradient(135deg, #0a0a0a 0%, #171717 52%, #262626 100%)",
        }}
      >
        <div tw="flex items-center justify-between">
          <div tw="rounded-full border border-neutral-600 px-5 py-2 text-xl text-neutral-200">
            {siteBrand.companyName}
          </div>
          <div tw="h-16 w-16 rounded-2xl border border-neutral-700 bg-neutral-900" />
        </div>
        <div tw="flex max-w-[960px] flex-col">
          <p tw="text-7xl font-bold leading-none">{title}</p>
          <p tw="mt-6 text-3xl text-neutral-300">
            Premium storefront experiences powered by Next.js and Medusa.
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: font,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
