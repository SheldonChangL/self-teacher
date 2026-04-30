import { notFound } from "next/navigation";
import { db, type Profile } from "@/lib/db";
import { dueToday } from "@/lib/vocab";
import { ReviewSession } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const cards = dueToday(id, 10);

  return <ReviewSession kidId={id} cards={cards} profileName={profile.name} />;
}
