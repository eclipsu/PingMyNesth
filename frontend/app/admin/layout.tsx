import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Admin",
  description: "Admin",
  path: "/admin", noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
