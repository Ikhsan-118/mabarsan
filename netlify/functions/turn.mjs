// Kredensial TURN dibuat di server: API key tidak pernah dikirim ke browser.
// Env: METERED_APP (subdomain Metered), METERED_API_KEY.
export default async function handler(){
  const app=process.env.METERED_APP,key=process.env.METERED_API_KEY;
  const headers={'content-type':'application/json','cache-control':'no-store'};
  if(!app||!key||!/^[a-z0-9-]+$/i.test(app))return new Response('[]',{status:200,headers});
  try{
    const r=await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
    if(!r.ok)return new Response('[]',{status:200,headers});
    return new Response(JSON.stringify(await r.json()),{status:200,headers});
  }catch(e){return new Response('[]',{status:200,headers})}
}
