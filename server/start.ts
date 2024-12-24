import cron from "node-cron";

let proc: ReturnType<typeof Bun.spawn>;

async function start() {
  proc = Bun.spawn(["bun", "run", "--smol", "./src/index.ts"], {
    onExit(_, exitCode, signalCode, error) {
      if ((signalCode as unknown as string) === "SIGTERM") {
        console.warn("Killed");
        return;
      }
      console.error("exit code", exitCode);
      console.error("signal code", signalCode);
      console.error(error);
      throw new Error("Process Failed");
    },
  });
  console.warn("Started");

  for await (const chunk of proc.stdout) {
    process.stdout.write(await new Response(chunk).text());
  }
}

const task = cron.schedule("0 9 * * *", async () => {
  proc.kill();
  start();
});
task.start();

start();
