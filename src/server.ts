import { createApp } from "./app.ts";
import { startRetryFailedLinksJob } from "./jobs/retryFailedLinks.job.ts";

const app = createApp();

app.listen(3000, "0.0.0.0", () => {
  console.log("Server listening on http://0.0.0.0:3000");
});

startRetryFailedLinksJob();
