import { z } from "zod";
import { type ToolDef, boolFlag } from "./types.js";

// herdr recognizes these agent integrations; herdr-mesh stays agnostic and
// works with whichever are installed/running.
export const integrationTools: ToolDef[] = [
  {
    name: "herdr_integration_status",
    description:
      "Show which agent integrations herdr knows about and their install status (pi, omp, claude, codex, opencode, hermes, qodercli, …). Use this to discover what agent types are available in this herdr install.",
    inputSchema: {
      outdated_only: z
        .boolean()
        .optional()
        .describe("Only list integrations whose hook/extension is outdated."),
    },
    buildArgs: (a) => {
      const argv = ["integration", "status"];
      boolFlag(argv, "--outdated-only", undefined, a.outdated_only);
      return argv;
    },
  },
];
