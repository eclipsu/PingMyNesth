import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "My Watches",
  description: "The class sections you're watching for open seats.",
  path: "/watches", noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
