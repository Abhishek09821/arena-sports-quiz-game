import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/server_auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(req: Request) {
  const auth = await getOptionalUser(req);
  if (!auth.userId) return NextResponse.json({error:"Sign in to use friends."},{status:401});
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({error:"Database unavailable"},{status:503});
  const query = new URL(req.url).searchParams.get("id");
  if (query) {
    if (!uuid.test(query)) return NextResponse.json({error:"Enter a complete user ID."},{status:400});
    const {data,error} = await db.from("profiles").select("id,display_name").eq("id",query).maybeSingle();
    return NextResponse.json(error ? {error:"Search unavailable"} : {player:data}, {status:error?503:200});
  }
  const [friends,invites] = await Promise.all([
    db.from("friendships").select("*").or(`sender.eq.${auth.userId},recipient.eq.${auth.userId}`).order("created_at",{ascending:false}),
    db.from("game_invitations").select("*").eq("recipient",auth.userId).is("read_at",null).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false})
  ]);
  if(friends.error || invites.error) return NextResponse.json({error:"Friends are unavailable. Check that database migration 004 is applied."},{status:503});
  const ids = [...new Set([...(friends.data || []).flatMap(f=>[f.sender,f.recipient]),...(invites.data || []).map(i=>i.sender)])];
  const profiles = ids.length ? await db.from("profiles").select("id,display_name").in("id",ids) : {data:[]};
  return NextResponse.json({friends:friends.data, invitations:invites.data, profiles:profiles.data}, {headers:{"Cache-Control":"no-store"}});
}
export async function POST(req: Request) {
  const auth = await getOptionalUser(req);
  if(!auth.userId) return NextResponse.json({error:"Sign in first"},{status:401});
  const db=getSupabaseAdminClient();
  if(!db) return NextResponse.json({error:"Database unavailable"},{status:503});
  try {
    const {action,id,kind,code}=await req.json();
    if(!uuid.test(id)) return NextResponse.json({error:"Invalid ID"},{status:400});
    let result;
    if(action==="request") {
      if(id===auth.userId) return NextResponse.json({error:"You cannot add yourself."},{status:400});
      result=await db.from("friendships").insert({sender:auth.userId,recipient:id});
    } else if(action==="accept") {
      result=await db.from("friendships").update({status:"accepted"}).eq("id",id).eq("recipient",auth.userId).eq("status","pending");
    } else if(action==="remove") {
      result=await db.from("friendships").delete().eq("id",id).or(`sender.eq.${auth.userId},recipient.eq.${auth.userId}`);
    } else if(action==="dismiss") {
      result=await db.from("game_invitations").update({read_at:new Date().toISOString()}).eq("id",id).eq("recipient",auth.userId);
    } else if(action==="invite") {
      if(!["challenge","multiplayer"].includes(kind) || typeof code!=="string" || !/^[A-Z0-9]{4,8}$/.test(code)) return NextResponse.json({error:"Enter a valid game code."},{status:400});
      const {data:friend}=await db.from("friendships").select("id").eq("status","accepted").or(`and(sender.eq.${auth.userId},recipient.eq.${id}),and(sender.eq.${id},recipient.eq.${auth.userId})`).maybeSingle();
      if(!friend) return NextResponse.json({error:"Only accepted friends can be invited."},{status:403});
      const {data:game}=await db.from(kind==="challenge"?"challenge_sets":"game_rooms").select("id").eq("code",code).maybeSingle();
      if(!game) return NextResponse.json({error:"Game code was not found."},{status:404});
      const {count}=await db.from("game_invitations").select("id",{count:"exact",head:true}).eq("sender",auth.userId).eq("recipient",id).gte("created_at",new Date(Date.now()-60000).toISOString());
      if(count) return NextResponse.json({error:"Invitation already sent. Wait a minute before sending another."},{status:429});
      result=await db.from("game_invitations").insert({sender:auth.userId,recipient:id,kind,code});
    } else return NextResponse.json({error:"Unknown action"},{status:400});
    if(result.error) return NextResponse.json({error:result.error.code==="23505"?"A request or friendship already exists.":"Could not save this action."},{status:409});
    return NextResponse.json({success:true});
  } catch {return NextResponse.json({error:"Invalid request"},{status:400});}
}
