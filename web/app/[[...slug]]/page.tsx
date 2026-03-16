import HomeClient from "./home-client";
import { isValidIP } from "@/lib/ip-detection";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // Extract IP from URL path (e.g., /1.1.1.1 → "1.1.1.1")
  let initialIP: string | undefined;
  if (slug && slug.length > 0) {
    const possibleIP = decodeURIComponent(slug.join("/"));
    if (isValidIP(possibleIP)) {
      initialIP = possibleIP;
    }
  }

  return <HomeClient initialIP={initialIP} />;
}
