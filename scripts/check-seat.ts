import { hasSeat } from "@/lib/member";

// Prints whether an email has members access (paid seat or comp list).
(async () => console.log(process.argv[2], await hasSeat(process.argv[2] ?? "")))();
