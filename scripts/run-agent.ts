import { run as operator } from "@/agents/operator";
import { run as compliance } from "@/agents/compliance";
import { answer } from "@/agents/support";

// Runs one agent on demand: operator | compliance | support "<question>"
const agents: Record<string, () => Promise<unknown>> = {
  operator, compliance,
  support: () => answer(process.argv[3] ?? "What do I get with a Founding Seat?", null),
};
(async () => console.log(JSON.stringify(await agents[process.argv[2]](), null, 2)))();
