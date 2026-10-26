import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "USM Schedule Builder: Find Every Class Schedule That Fits",
  description: "Build your Southern Miss class schedule: add courses, block off work or practice, and flip through every clash-free combination of sections, with seat alerts for full ones.",
  path: "/schedule",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
