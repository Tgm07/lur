const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const root = __dirname;
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const cache = path.join(root, 'audio-cache');
fs.mkdirSync(cache, {recursive:true});
const legacy = path.join(root, '../lyric-stage-android/bridge-audio-cache');
const executable = process.env.YTDLP_PATH || 'D:\\Download\\LEAFREA\\lyrics-studio\\vendor\\bin\\yt-dlp.exe';
const tasks = new Map();
const valid = id => /^[\w-]{11}$/.test(id);
function json(res, value, status=200) {res.writeHead(status, {'Content-Type':'application/json'});res.end(JSON.stringify(value));}
async function search(query) {
 const version = `1.${new Date().toISOString().slice(0,10).replaceAll('-','')}.01.00`;
 const response = await fetch('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','Origin':'https://music.youtube.com','X-YouTube-Client-Name':'67','X-YouTube-Client-Version':version},body:JSON.stringify({context:{client:{clientName:'WEB_REMIX',clientVersion:version,hl:'en',gl:'IN'}},query,params:'EgWKAQIIAWoMEA4QChADEAQQCRAF'})});
 if(!response.ok) throw Error('Song search is temporarily unavailable. Try again.');
 const results = new Map();
 const find = (obj,key) => {if(!obj || typeof obj!=='object')return; if(typeof obj[key]==='string')return obj[key];for(const value of Object.values(obj)){const hit=find(value,key);if(hit)return hit;}};
 const walk = obj => {if(!obj||typeof obj!=='object')return;const r=obj.musicResponsiveListItemRenderer;if(r){const id=find(r,'videoId');const cols=r.flexColumns||[];const runs=i=>cols[i]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs||[];const title=runs(0).map(x=>x.text).join('');const artist=runs(1).find(x=>x.text && !['Song','Video',' • ',' •','•'].includes(x.text))?.text||'YouTube Music';const thumbs=r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails; if(valid(id)&&title)results.set(id,{id,title,artist,cover:thumbs?.at(-1)?.url||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`});}for(const v of Object.values(obj))walk(v);};
 walk(await response.json());return [...results.values()].slice(0,25);
}
function audio(id) {
 for(const folder of [cache,legacy]){const file=path.join(folder,id+'.m4a');if(fs.existsSync(file))return Promise.resolve(file);}
 if(tasks.has(id))return tasks.get(id);
 const target=path.join(cache,id+'.m4a');
 const task=new Promise((resolve,reject)=>{const child=spawn(executable,['--no-playlist','--socket-timeout','20','--retries','1','-f','bestaudio[ext=m4a]','-o',target,`https://www.youtube.com/watch?v=${id}`],{windowsHide:true});let error='';const timer=setTimeout(()=>{child.kill();reject(Error('Playback took too long. Try another song.'));},90000);child.stderr.on('data',x=>error+=x);child.on('error',()=>{clearTimeout(timer);reject(Error('Audio downloader could not start.'));});child.on('close',code=>{clearTimeout(timer);if(code===0&&fs.existsSync(target))resolve(target);else {console.error(error.slice(-1500));reject(Error('YouTube could not provide this track. Try another song.'));}});}).finally(()=>tasks.delete(id));tasks.set(id,task);return task;
}
function stream(req,res,file){const size=fs.statSync(file).size;res.setHeader('Content-Type','audio/mp4');res.setHeader('Accept-Ranges','bytes');let start=0,end=size-1;if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416);return res.end();}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});}else res.writeHead(200,{'Content-Length':size});const source=fs.createReadStream(file,{start,end});source.pipe(res);res.on('close',()=>source.destroy());}
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
 if(url.pathname==='/api/account-config'){res.setHeader('Cache-Control','no-store');const key=process.env.SUPABASE_PUBLISHABLE_KEY||'';let safe=key.startsWith('sb_publishable_');try{safe ||= JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{}return json(res,{url:safe?process.env.SUPABASE_URL||'':'',key:safe?key:''});}
 if(url.pathname==='/api/search'){const q=(url.searchParams.get('q')||'').trim().slice(0,150);return json(res,q?await search(q):[]);}
 if(url.pathname==='/api/prepare'){const id=url.searchParams.get('id');if(!valid(id))return json(res,{error:'Invalid track'},400);await audio(id);return json(res,{url:`/audio?id=${id}`});}
 if(url.pathname==='/audio'){const id=url.searchParams.get('id');if(!valid(id))return json(res,{error:'Invalid track'},400);return stream(req,res,await audio(id));}
 if(url.pathname==='/api/lyrics'){const title=url.searchParams.get('title')||'';const artist=url.searchParams.get('artist')||'';const upstream=await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,{signal:AbortSignal.timeout(12000)});if(!upstream.ok)return json(res,[]);return json(res,await upstream.json());}
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/compact.css':'compact.css','/onboarding.css':'onboarding.css','/onboarding.bundle.js':'onboarding.bundle.js'};const file=files[url.pathname];if(!file)return json(res,{error:'Not found'},404);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(path.join(root,file)).pipe(res);
 }catch(error){json(res,{error:error.message},502);}}).listen(8787,'127.0.0.1',()=>console.log('Lyric Stage: http://127.0.0.1:8787'));
