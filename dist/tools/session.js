import { z } from "zod";
export const sessionTools = [
    {
        name: "herdr_session_list",
        description: "List herdr persistent sessions. Sessions survive disconnects and can be shared/reattached locally or over SSH.",
        inputSchema: {},
        buildArgs: () => ["session", "list", "--json"],
    },
    {
        name: "herdr_session_stop",
        description: "Stop a named session (use 'default' to target the default session). Stops the server-side session; clients detach.",
        inputSchema: {
            name: z.string().describe("Session name, or 'default'."),
        },
        buildArgs: (a) => ["session", "stop", String(a.name), "--json"],
    },
    {
        name: "herdr_session_delete",
        description: "Delete a named session permanently.",
        inputSchema: {
            name: z.string().describe("Session name to delete."),
        },
        buildArgs: (a) => ["session", "delete", String(a.name), "--json"],
    },
];
//# sourceMappingURL=session.js.map