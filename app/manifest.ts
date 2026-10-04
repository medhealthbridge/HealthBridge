import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isAdminHost } from "@/src/lib/clinic-host";

/**
 * The install manifest. One app, three front doors (the Clinix site and clinic subdomains, and the
 * company admin), so it is built per host: installing from admin.* gives the admin its own name.
 * `start_url: "/"` is right on every host because the proxy sends "/" to that host's home.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const admin = isAdminHost((await headers()).get("host"));
  return {
    id: "/",
    name: admin ? "DataBridgeSol Admin" : "Clinix PH",
    short_name: admin ? "DBS Admin" : "Clinix",
    description: admin ? "DataBridgeSol company admin: clinics, billing and support." : "Clinic software for Philippine clinics: patients, appointments, billing and inventory.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f8fa",
    theme_color: "#0f766e",
    categories: ["medical", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
