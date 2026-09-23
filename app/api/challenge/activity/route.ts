import {NextResponse} from "next/server";
import {getOptionalUser} from "@/lib/auth/server_auth";
import {getSupabaseAdminClient} from "@/lib/supabase-server";
export async function GET(req:Request){
 const auth=await getOptionalUser(req);if(!auth.userId)return NextResponse.json({error:"Sign in first"},{status:401});
 const db=getSupabaseAdminClient();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
 const {data,error}=await db.from("challenge_sets").select("id,title,code,created_at,challenge_plays(user_id,created_at,profiles(display_name))").eq("created_by",auth.userId).order("created_at",{ascending:false});
 if(error)return NextResponse.json({error:"Could not load challenge activity. Apply migration 004."},{status:503});
 return NextResponse.json({challenges:data},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 const auth=await getOptionalUser(req);if(!auth.userId)return NextResponse.json({error:"Sign in first"},{status:401});
 const db=getSupabaseAdminClient();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});
 const {challengeId}=await req.json();
 const {error}=await db.from("challenge_plays").upsert({challenge_id:challengeId,user_id:auth.userId},{onConflict:"challenge_id,user_id",ignoreDuplicates:true});
 return NextResponse.json(error?{error:"Could not record play"}:{success:true},{status:error?400:200});
}
