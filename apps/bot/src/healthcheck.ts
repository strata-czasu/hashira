const FILENAME = "/tmp/bot_healthcheck.json";

type HealthCheckData = {
  pid: number;
  uptime: number;
  timestamp: string;
};

export async function writeHealthCheck() {
  const healthData: HealthCheckData = {
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await Bun.write(FILENAME, JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error(`Failed to write health check: ${error}`);
  }
}

export async function readHealthCheck() {
  try {
    const data = await Bun.file(FILENAME).json();
    return data as HealthCheckData;
  } catch (error) {
    console.error(`Failed to read health check: ${error}`);
    return null;
  }
}
