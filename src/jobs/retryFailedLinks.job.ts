import { schedule } from "node-cron";
import { getFailedLinks, retryLink } from "../services/links.service.ts";

export async function retryFailedLinksJob() {
  const failedLinks = await getFailedLinks();

  let successCount = 0;
  for (const link of failedLinks) {
    const updated = await retryLink(link.id, link.url);
    if (updated?.fetch_status === "ok") {
      successCount++;
    }
  }

  console.log(
    `Retry-Job: ${failedLinks.length} Links geprüft, ${successCount} erfolgreich aktualisiert`,
  );
}

export function startRetryFailedLinksJob() {
  if (process.env.CRON_ENABLED === "false") {
    console.log("Retry-Job ist deaktiviert (CRON_ENABLED=false)");
    return;
  }

  schedule("*/5 * * * *", retryFailedLinksJob);
  console.log("Retry-Job gestartet (alle 5 Minuten)");
}
