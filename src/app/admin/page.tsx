import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://vappino-e-commerce-platform-build-nour-991c.vercel.app/admin";

export default function AdminPage() {
  // The GitHub Pages build is static (no API), so the dashboard only runs on the Vercel deployment.
  return <AdminApp staticHost={process.env.STATIC_EXPORT === "1"} adminUrl={ADMIN_URL} />;
}
