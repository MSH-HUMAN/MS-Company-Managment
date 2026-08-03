import { redirect } from "next/navigation";

export default async function DirectTrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (code) {
    redirect(`/track?code=${encodeURIComponent(code)}`);
  }
  redirect("/track");
}
