import { NextResponse } from "next/server";

/** Keep configuration/capacity failures distinct from invalid quiz selections. */
export function quizErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to prepare your round. Please retry.";
  const auth = /sign in/i.test(message);
  const selection = /choose a|supported sport|supported difficulty|valid decade|between 1 and 30/i.test(message);
  const status = auth ? 401 : selection ? 400 : 503;
  return NextResponse.json({success:false,error:message,message}, {
    status,
    headers: status === 503 ? {"Retry-After":"60", "Cache-Control":"no-store"} : {"Cache-Control":"no-store"},
  });
}
