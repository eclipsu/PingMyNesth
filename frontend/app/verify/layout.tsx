import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Verify Your Email",
  description: "Finish signing in to Ping My Nest.",
  path: "/verify", noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
