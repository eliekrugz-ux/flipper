"use server";

import { answer } from "@/agents/support";

export async function ask(question: string, email: string) {
  return answer(question, email.trim() || null);
}
