/**
 * Microgrid Digital Twin - Main Page
 * ===================================
 * Redirects to VLabs Simulation page.
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/vlabs-simulation");
}
