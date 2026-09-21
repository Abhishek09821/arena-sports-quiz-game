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

  let lastDeck: Awaited<ReturnType<typeof generatePersonalizedQuiz>> | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const history: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from("question_history").select("question_text").eq("user_id", auth.userId).order("question_key").range(offset, offset + 999);
      // Account history improves deduplication across devices, but it must never
      // prevent the core AI quiz flow from working if the optional schema is
      // missing or temporarily unavailable. The browser exclusions in params
      // still protect the current device.
      if (error) {
        console.warn("[question history] Read unavailable; continuing with browser history:", error.message);
        return generatePersonalizedQuiz(params);
      }
      history.push(...(data || []).map(row => row.question_text));
      if (!data || data.length < 1000) break;
    }
    const deck = await generatePersonalizedQuiz({ ...params, excludeStems: [...history, ...(params.excludeStems || [])] });
    lastDeck = deck;
    const entries = deck.questions.map(q => ({ question_key: createHash("sha256").update(canonicalizeStem(q.question)).digest("hex"), question_text: q.question }));
    const { data, error } = await client.rpc("reserve_question_history", { entries });
    if (error) {
      console.warn("[question history] Save unavailable; returning generated quiz:", error.message);
      return deck;
    }
    if (data === true) return deck;
    // Another tab reserved one of these questions; reload history and replace the deck.
  }
  // Repeated reservation collisions are extremely rare. Serving the already
  // validated deck is preferable to blocking the player over optional history.
  return lastDeck ?? generatePersonalizedQuiz(params);
}
