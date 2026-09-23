import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth/server_auth";
import {getSupabaseAdminClient} from "@/lib/supabase-server";
export async function GET(req:Request){
 const auth=await requireAdmin(req);if(auth instanceof NextResponse)return auth;
 const db=getSupabaseAdminClient();if(!db)return NextResponse.json({error:"Database is not connected."},{status:503});
 const url=new URL(req.url);const page=Math.max(0,Number(url.searchParams.get("page"))||0);const start=page*50;
 const results=await Promise.all([
 db.from("profiles").select("id,display_name,created_at",{count:"exact"}).order("created_at",{ascending:false}).range(start,start+49),
 db.from("game_rooms").select("id,code,status,created_at",{count:"exact"}).order("created_at",{ascending:false}).range(start,start+49),
 db.from("challenge_sets").select("id,title,code,creator_name,created_at",{count:"exact"}).order("created_at",{ascending:false}).range(start,start+49)
 ]);
 if(results.some(r=>r.error))return NextResponse.json({error:"Could not read live database records. Counts have not been estimated."},{status:503});
 return NextResponse.json({timestamp:new Date().toISOString(),users:{total:results[0].count,rows:results[0].data},rooms:{total:results[1].count,rows:results[1].data},challenges:{total:results[2].count,rows:results[2].data}}, {headers:{"Cache-Control":"no-store"}});
}
