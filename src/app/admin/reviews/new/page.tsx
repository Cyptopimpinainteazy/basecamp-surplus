import { WriteReviewForm } from "./write-form";

export const metadata = { title: "Write a review" };

export default async function NewReview({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  return (
    <div className="max-w-2xl">
      <h1 className="display text-6xl">Write a review</h1>
      <p className="mt-3 text-muted">
        Claude researches the model online (manufacturer specs, retailers, independent tests) and writes a full review with
        sources. It&apos;s saved as a draft for you to check and publish.
      </p>
      <WriteReviewForm initialSubject={subject ?? ""} />
    </div>
  );
}
