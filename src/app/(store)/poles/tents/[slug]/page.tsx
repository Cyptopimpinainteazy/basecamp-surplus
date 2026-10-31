import { notFound, permanentRedirect } from "next/navigation";
import { poleGuide, poleGuides } from "@/lib/pole-guides";

// Former tent pole guide URLs. The model parts page now carries the same
// reference details plus stock, sizes and alerts, so these redirect there.

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return poleGuides.map((t) => ({ slug: t.slug }));
}

export default async function LegacyPoleGuide({ params }: Props) {
  const guide = poleGuide((await params).slug);
  if (!guide) notFound();
  permanentRedirect(`/parts/${guide.partsSlug}`);
}
