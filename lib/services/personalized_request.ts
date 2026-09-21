import { createHash } from "node:crypto";
import { getOptionalUser } from "@/lib/auth/server_auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { canonicalizeStem } from "@/lib/seen_history";
import { generatePersonalizedQuiz, type CreateQuizRequest } from "./question_manager";

/** Authenticated history survives browser clearing and is reserved atomically across tabs. */
export async function generateForRequest(req: Request, params: CreateQuizRequest) {
  const auth = await getOptionalUser(req);
  const client = auth.userId ? getSupabaseServerClient(req.headers.get("authorization")) : null;
  if (!auth.userId || !client) return generatePersonalizedQuiz(params);
  for (let attempt = 0; attempt < 3; attempt++) {
    const history: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from("question_history").select("question_text").eq("user_id", auth.userId).order("question_key").range(offset, offset + 999);
      if (error) throw new Error("Question history is unavailable. Apply the question-history database migration before playing.");
      history.push(...(data || []).map(row => row.question_text));
      if (!data || data.length < 1000) break;
    }
    const deck = await generatePersonalizedQuiz({ ...params, excludeStems: [...history, ...(params.excludeStems || [])] });
    const entries = deck.questions.map(q => ({ question_key: createHash("sha256").update(canonicalizeStem(q.question)).digest("hex"), question_text: q.question }));
    const { data, error } = await client.rpc("reserve_question_history", { entries });
    if (error) throw new Error("Unable to save question history. Please retry before starting a round.");
    if (data === true) return deck;
    // Another tab reserved one of these questions; reload history and replace the deck.
  }
  throw new Error("Another round is being prepared for this account. Please retry.");
}
