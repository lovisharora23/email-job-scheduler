import Link from "next/link";
import { redirect } from "next/navigation";

// just redirect / to /dashboard — login guard handles the rest
export default function HomePage() {
  redirect("/dashboard");
}
