const $ = (id) => document.getElementById(id);
let rows = [];

const CATEGORIES = [
  "commercial",
  "catering.restaurant",
  "catering.cafe",
  "catering.fast_food",
  "commercial.supermarket",
  "commercial.convenience",
  "commercial.clothes",
  "commercial.electronics",
  "service",
  "service.vehicle.repair",
  "service.beauty",
  "service.education"
].join(",");

function normalizePhone(value){
  if(!value) return "";
  let s = String(value).trim();
  s = s.replace(/(?:ext|x|extension)\s*[\d-]+$/i,"").trim();
  const digits = s.replace(/\D/g,"");
  if(!digits) return "";
  if(digits.startsWith("0062")) return "62" + digits.slice(4);
  if(digits.startsWith("62")) return digits;
  if(digits.startsWith("0")) return "62" + digits.slice(1);
  if(digits.startsWith("8")) return "62" + digits;
  return digits;
}

function isIndonesiaMobile(n){
  return /^628[1-9][0-9]{7,11}$/.test(n);
}

function phoneCandidates(p){
  const out = [];
  const c = p?.contact || {};
  for(const v of [c.phone, ...(c.phone_other || [])]) if(v) out.push(v);
  if(c.phone_international && typeof c.phone_international==="object"){
    Object.values(c.phone_international).forEach(v => { if(typeof v==="string") out.push(v); });
  }
  return [...new Set(out.map(normalizePhone).filter(Boolean))];
}

function mapsLink(lat, lon, name){
  if(lat && lon) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name||"")}`;
}

async function geocode(location, apiKey){
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", location);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "id");
  url.searchParams.set("apiKey", apiKey);
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Geocoding gagal (${r.status})`);
  const data = await r.json();
  if(!data.features?.length) throw new Error("Lokasi tidak ditemukan.");
  return data.features[0];
}

async function geoapifyPlaces(locationFeature, keyword, limit, apiKey){
  const [lon, lat] = locationFeature.geometry.coordinates;
  const radius = 15000;
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", CATEGORIES);
  url.searchParams.set("filter", `circle:${lon},${lat},${radius}`);
  url.searchParams.set("bias", `proximity:${lon},${lat}`);
  url.searchParams.set("limit", String(Math.min(limit,100)));
  url.searchParams.set("offset","0");
  url.searchParams.set("lang","id");
  url.searchParams.set("apiKey", apiKey);
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Places gagal (${r.status})`);
  const data = await r.json();
  const needle = keyword.toLowerCase().trim();
  return (data.features||[]).filter(f => {
    if(!needle) return true;
    const p=f.properties||{};
    const hay=[p.name,p.address_line1,p.address_line2,p.formatted,(p.categories||[]).join(" ")].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(needle);
  });
}

async function overpassPlaces(locationFeature, keyword){
  const [lon, lat] = locationFeature.geometry.coordinates;
  const around = 15000;
  const term = keyword.trim().replace(/\\/g," ").replace(/"/g,'\\"');
  const regex = term ? `["name"~"${term}",i]` : `["name"]`;
  const q = `
[out:json][timeout:25];
(
  node(around:${around},${lat},${lon})["phone"]${regex};
  way(around:${around},${lat},${lon})["phone"]${regex};
  relation(around:${around},${lat},${lon})["phone"]${regex};
  node(around:${around},${lat},${lon})["contact:phone"]${regex};
  way(around:${around},${lat},${lon})["contact:phone"]${regex};
  relation(around:${around},${lat},${lon})["contact:phone"]${regex};
);
out center tags;
`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  let last;
  for(const ep of endpoints){
    try{
      const r=await fetch(ep,{method:"POST",body:new URLSearchParams({data:q})});
      if(!r.ok) throw new Error(`Overpass ${r.status}`);
      return await r.json();
    }catch(e){ last=e; }
  }
  throw last || new Error("Overpass gagal");
}

function mapOverpass(data){
  return (data.elements||[]).map(e=>{
    const t=e.tags||{};
    const lat=e.lat ?? e.center?.lat ?? "";
    const lon=e.lon ?? e.center?.lon ?? "";
    return {
      name:t.name||"Tanpa nama",
      formatted:[t["addr:housenumber"],t["addr:street"],t["addr:city"]].filter(Boolean).join(" ")||"",
      city:t["addr:city"]||"",
      lat,lon,
      phones:[t.phone,t["contact:phone"],t.mobile,t["contact:mobile"]].filter(Boolean),
      website:t.website||t["contact:website"]||"",
      source:"OpenStreetMap / Overpass",
      link:mapsLink(lat,lon,t.name)
    };
  });
}

function mapGeoapify(features){
  const out=[];
  for(const f of features){
    const p=f.properties||{};
    const phones=phoneCandidates(p);
    out.push({
      name:p.name||"Tanpa nama",
      formatted:p.formatted||[p.address_line1,p.address_line2].filter(Boolean).join(", "),
      city:p.city||"",
      lat:p.lat,lon:p.lon,
      phones,
      website:p.website||"",
      source:"Geoapify / OpenStreetMap",
      link:mapsLink(p.lat,p.lon,p.name)
    });
  }
  return out;
}

function mergeResults(a,b){
  const map=new Map();
  for(const item of [...a,...b]){
    const phones=(item.phones||[]).map(normalizePhone).filter(n=>isIndonesiaMobile(n));
    for(const phone of phones){
      if(!map.has(phone)){
        map.set(phone,{phone,name:item.name,formatted:item.formatted,city:item.city,source:item.source,link:item.link,website:item.website});
      }else{
        const cur=map.get(phone);
        const srcs = new Set([...(cur.source||"").split(" + "),item.source]);
        cur.source=[...srcs].filter(Boolean).join(" + ");
        if(!cur.website && item.website) cur.website=item.website;
      }
    }
  }
  return [...map.values()];
}

function render(data){
  const tbody=$("results");
  tbody.innerHTML="";
  data.forEach((r,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td>
      <td class="num"><a href="https://wa.me/${r.phone}" target="_blank" rel="noopener">${r.phone}</a></td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.formatted || r.city || "-")}</td>
      <td>${esc(r.source)}</td>
      <td><a href="${r.link}" target="_blank" rel="noopener">Maps</a>${r.website?` · <a href="${esc(r.website)}" target="_blank" rel="noopener">Web</a>`:""}</td>`;
    tbody.appendChild(tr);
  });
  $("found").textContent=data.length;
  $("places").textContent=new Set(data.map(x=>x.name)).size;
  $("sources").textContent=new Set(data.flatMap(x=>(x.source||"").split(" + "))).size;
  $("exportBtn").disabled=!data.length;
  $("copyBtn").disabled=!data.length;
}

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

$("searchBtn").onclick=async()=>{
  const keyword=$("keyword").value.trim();
  const location=$("location").value.trim();
  const apiKey=$("apiKey").value.trim();
  if(!location) return setStatus("Isi lokasi terlebih dahulu.");
  if(!apiKey) return setStatus("Masukkan Geoapify API key gratis. Key hanya dipakai di browser.");
  localStorage.setItem("bw_geoapify_key",apiKey);
  $("searchBtn").disabled=true;
  setStatus("Mencari lokasi dan mengambil data dari 2 jalur sumber...");
  try{
    const loc=await geocode(location,apiKey);
    const [g,o]=await Promise.allSettled([
      geoapifyPlaces(loc,keyword,Number($("limit").value),apiKey),
      overpassPlaces(loc,keyword)
    ]);
    const ga = g.status==="fulfilled" ? mapGeoapify(g.value) : [];
    const ov = o.status==="fulfilled" ? mapOverpass(o.value) : [];
    rows=mergeResults(ga,ov);
    render(rows);
    const notes=[];
    if(g.status!=="fulfilled") notes.push("Geoapify gagal");
    if(o.status!=="fulfilled") notes.push("Overpass gagal");
    setStatus(`Selesai: ${rows.length} nomor seluler Indonesia unik.${notes.length?" ("+notes.join(", ")+")":""}`);
  }catch(e){
    setStatus(e.message || "Terjadi kesalahan.");
  }finally{
    $("searchBtn").disabled=false;
  }
};

$("clearBtn").onclick=()=>{
  rows=[];render([]);$("keyword").value="";$("location").value="";setStatus("Form dibersihkan.");
};

$("copyBtn").onclick=async()=>{
  await navigator.clipboard.writeText(rows.map(r=>r.phone).join("\n"));
  setStatus(`Berhasil menyalin ${rows.length} nomor.`);
};

$("exportBtn").onclick=()=>{
  const data=rows.map((r,i)=>({No:i+1,WhatsApp:r.phone,Nama_Bisnis:r.name,Lokasi:r.formatted,Sumber:r.source,Maps:r.link,Website:r.website||""}));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Nomor");
  XLSX.writeFile(wb,`business-whatsapp-${new Date().toISOString().slice(0,10)}.xlsx`);
};

function setStatus(s){$("status").textContent=s}
$("apiKey").value=localStorage.getItem("bw_geoapify_key")||"";
