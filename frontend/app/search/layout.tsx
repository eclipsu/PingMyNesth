import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Search USM Classes and Open Seats",
  description: "Search every University of Southern Mississippi class section by course, professor, time or campus, see live open seats, and get an alert when a full section opens.",
  path: "/search",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
