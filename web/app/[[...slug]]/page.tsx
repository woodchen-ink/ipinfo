import HomeClient from "./home-client";

// Required by output: "export" — only pre-render the root path "/".
// IP paths like /1.1.1.1 are handled client-side via SPA fallback.
export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function Page() {
  return <HomeClient />;
}
