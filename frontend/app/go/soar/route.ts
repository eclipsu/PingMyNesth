import { NextResponse } from "next/server";

// Emails link here instead of straight to soar.usm.edu so every link in a
// message matches the sending domain (mismatched links trip spam filters).
export function GET() {
  return NextResponse.redirect("https://soar.usm.edu", 307);
}
