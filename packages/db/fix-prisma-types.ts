const glob = new Bun.Glob("**/*.ts");
import path from "node:path";

const cwd = path.join(import.meta.dir, "src", "generated", "prisma");

for await (const file of glob.scan({ cwd, absolute: true })) {
  const content = await Bun.file(file).text();

  const newContent = content.replace("/* @ts-nocheck */", "// @ts-nocheck");

  await Bun.write(file, newContent);
}
