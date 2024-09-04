import { spawn } from "bun";

const botProcess = spawn(["bun", "src/index.ts"], {
  stdout: "inherit",
  cwd: __dirname,
});

process.on("beforeExit", async (code) => {
  botProcess.kill(code);
  await botProcess.exited;
});

await botProcess.exited;
