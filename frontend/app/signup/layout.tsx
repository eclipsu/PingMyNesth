import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Sign Up for Free Class Seat Alerts",
  description: "Sign in with your email to get notified the moment a seat opens in a full USM class. Free, no password.",
  path: "/signup",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
