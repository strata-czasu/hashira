import { differenceInSeconds } from "date-fns";
import { readHealthCheck } from "./src/healthcheck.ts";

const TIMEOUT_SECONDS = 65;

if (import.meta.main) {
  const healthData = await readHealthCheck();
  if (healthData) {
    console.log("Health Check Data:", healthData);
  } else {
    console.error("Failed to read health check data.");
    process.exit(1);
  }

  const diffSeconds = differenceInSeconds(new Date(), new Date(healthData.timestamp));
  if (diffSeconds > TIMEOUT_SECONDS) {
    console.error(`Health check timeout. Seconds since last heartbeat: ${diffSeconds}`);
    process.exit(1);
  } else {
    console.log(
      `Health check successful. Seconds since last heartbeat: ${diffSeconds}`,
    );
  }
}
