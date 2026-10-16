import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isDirectRunHost } from "@/lib/host";

/** La URL directa de Cloud Run no debe indexarse (duplicaría el dominio del club); el dominio propio no cambia. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  return isDirectRunHost(await headers()) ? { rules: { userAgent: "*", disallow: "/" } } : { rules: { userAgent: "*", allow: "/" } };
}
