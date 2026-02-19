import OpengraphImage from "components/template-opengraph-image";
import { getPage } from "lib/medusa";

export default async function Image({ params }: { params: { page: string } }) {
  const page = await getPage(params.page);
  const title = page.seo?.title || page.title;

  return await OpengraphImage({ title });
}
