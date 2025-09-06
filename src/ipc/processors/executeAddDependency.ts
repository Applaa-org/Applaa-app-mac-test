import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "../ipc_types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const execPromise = promisify(exec);

export async function executeAddDependency({
  packages,
  message,
  appPath,
}: {
  packages: string[];
  message: Message;
  appPath: string;
}) {
  const packageStr = packages.join(" ");
  // Prefer Expo-aware install, then npm, finally pnpm
  // - expo install picks compatible versions for the SDK (prevents ETARGET)
  // - npm --legacy-peer-deps avoids peer dependency prompts
  // - pnpm may not be present on user machines; use it as last resort
  const installCmd = [
    `npx expo install ${packageStr}`,
    `npm install --legacy-peer-deps ${packageStr}`,
    `pnpm add ${packageStr}`,
  ].join(" || ");

  const { stdout, stderr } = await execPromise(installCmd, {
    cwd: appPath,
  });
  const installResults = stdout + (stderr ? `\n${stderr}` : "");

  // Update the message content with the installation results
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-dependency packages="${packages.join(
        " ",
      )}">[^<]*</dyad-add-dependency>`,
      "g",
    ),
    `<dyad-add-dependency packages="${packages.join(
      " ",
    )}">${installResults}</dyad-add-dependency>`,
  );

  // Save the updated message back to the database
  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));
}
