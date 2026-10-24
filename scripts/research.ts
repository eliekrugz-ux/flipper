import { run } from "@/agents/researcher";

// Runs the Researcher once: scores Study 1 answers and ships the winner when enough are in.
(async () => console.log(await run()))();
