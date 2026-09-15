const $=id=>document.getElementById(id);
let results=[];

function normalizePhone(v){
  const d=String(v||"").replace(/\D/g,"");
  if(!d) return "";
  if(d.startsWith("0062")) return "62"+d.slice(4);
  if(d.startsWith("62")) return d;
  if(d.startsWith("0")) return "62"+d.slice(1);
  if(d.startsWith("8")) return "62"+d;
  return "";
}
function isMobile(n){return /^628[1-9][0-9]{7,11}$/.test(n)}
function first(...vals){return vals.find(v=>v!==undefined&&v!==null&&String(v).trim()!=="")||""}
function getPhones(item){
  const vals=[
    item.phone,
    item.phoneNumber,
    item.nationalPhoneNumber,
    item.internationalPhoneNumber,
    item.phoneUnformatted,
    ...(Array.isArray(item.phones)?item.phones:[]),
    ...(Array.isArray(item.site_phones)?item.site_phones:[])
  ];
  return [...new Set(vals.map(normalizePhone).filter(isMobile))];
}
function safe(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function run(){
  const token=$("token").value.trim();
  const keyword=$("keyword").value.trim();
  const location=$("location").value.trim();
  const limit=Number($("limit").value);
  if(!token||!keyword||!location){$("status").textContent="Isi token, keyword, dan lokasi.";return}
  $("search").disabled=true;$("status").textContent="Menjalankan Google Maps Scraper...";
  try{
    const body={
      searchStringsArray:[keyword],
      locationQuery:location,
      maxCrawledPlacesPerSearch:limit,
      language:"id",
      maximumLeadsEnrichmentRecords:0,
      maxImages:0,
      scrapeSocialMediaProfiles:{
        facebooks:false,instagrams:false,youtubes:false,tiktoks:false,twitters:false
      }
    };
    const url="https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token="+encodeURIComponent(token);
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok){
      const text=await r.text();
      throw new Error(`Apify ${r.status}: ${text.slice(0,220)}`);
    }
    const data=await r.json();
    const map=new Map();
    for(const item of Array.isArray(data)?data:[]){
      for(const phone of getPhones(item)){
        if(!map.has(phone)){
          map.set(phone,{
            phone,
            name:first(item.title,item.name),
            address:first(item.address,item.street,item.city),
            source:"Apify / Google Maps",
            maps:first(item.placeUrl,item.url,item.searchUrl)
          });
        }
      }
    }
    results=[...map.values()];
    render();
    $("status").textContent=`Selesai. ${results.length} nomor seluler unik dari ${Array.isArray(data)?data.length:0} tempat.`;
  }catch(e){$("status").textContent=e.message||"Gagal menjalankan pencarian."}
  finally{$("search").disabled=false}
}
function render(){
  const t=$("tbody");t.innerHTML="";
  results.forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td class="num"><a href="https://wa.me/${r.phone}" target="_blank" rel="noopener">${r.phone}</a></td><td>${safe(r.name)}</td><td>${safe(r.address||"-")}</td><td>Apify / Google Maps${r.maps?` · <a href="${safe(r.maps)}" target="_blank" rel="noopener">Maps</a>`:""}</td>`;
    t.appendChild(tr)
  });
  $("count").textContent=results.length;
  $("places").textContent=results.length;
  $("copy").disabled=!results.length;$("export").disabled=!results.length;
}
$("search").onclick=run;
$("clear").onclick=()=>{results=[];render();$("keyword").value="";$("location").value="";$("status").textContent="Dibersihkan."};
$("copy").onclick=async()=>{await navigator.clipboard.writeText(results.map(x=>x.phone).join("\n"));$("status").textContent=`${results.length} nomor disalin.`};
$("export").onclick=()=>{
  const data=results.map((r,i)=>({No:i+1,WhatsApp:r.phone,Nama_Bisnis:r.name,Lokasi:r.address,Sumber:r.source,Maps:r.maps||""}));
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"WhatsApp");
  XLSX.writeFile(wb,`whatsapp-finder-${new Date().toISOString().slice(0,10)}.xlsx`);
};
