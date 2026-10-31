import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/lib/config";
import { getArticleById } from "@/lib/articles";
import { ReviewEditor } from "./review-editor";

export const dynamic = "force-dynamic";

export default async function EditReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getArticleById(id);
  if (!a) notFound();
  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/reviews" className="underline">Reviews</Link>
        {a.status === "published" && <> · <Link href={`/reviews/${a.slug}`} target="_blank" className="underline">View on site</Link></>}
      </p>
      <h1 className="display text-5xl">{a.title}</h1>
      <p className="mt-1 capitalize text-muted">{a.status}</p>
      <ReviewEditor a={a} categories={categories.map((c) => ({ value: c.slug, label: c.name }))} />
    </div>
  );
}
