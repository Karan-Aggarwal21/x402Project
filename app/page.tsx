/**
 * OWNER: UI
 * WHAT: Root route. Sends everyone to the dashboard.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/overview");
}

