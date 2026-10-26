import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "USM Prerequisite Map",
  description: "See which University of Southern Mississippi courses unlock which, as an interactive prerequisite map, so you know what to take first.",
  path: "/prereqs",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
