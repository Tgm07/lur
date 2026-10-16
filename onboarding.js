import { createClient } from '@supabase/supabase-js';

const intro=document.getElementById('welcome');
const dialog=document.getElementById('usernameDialog');
const form=document.getElementById('usernameForm');
const input=document.getElementById('username');
const error=document.getElementById('accountError');
const submit=document.getElementById('saveUsername');
const account=document.getElementById('accountButton');
let client=null,user=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function connect(){
 try{
  const response=await fetch('/api/account-config',{signal:AbortSignal.timeout(8000)});
  const config=await response.json();
  if(!config.url||!config.key)return;
  client=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data}=await client.auth.getSession();
  user=data.session?.user||null;
  client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;updateAccount();});
 }catch{error.textContent='Account connection is unavailable. You can still listen as a guest.';}
}
function updateAccount(){const name=user?.user_metadata?.username;account.textContent=name?'@'+name:'Account';account.setAttribute('aria-label',name?'Account: '+name:'Set up your account');}
function openAccount(){error.textContent=client?'':'Account saving is not connected yet. You can still listen as a guest.';submit.disabled=!client;input.value=user?.user_metadata?.username||'';dialog.showModal();input.focus();}
function closeAccount(){dialog.close();account.focus();}
account.onclick=openAccount;
document.getElementById('skipAccount').onclick=closeAccount;
form.addEventListener('submit',async event=>{
 event.preventDefault();const username=input.value.trim();
 if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)){error.textContent='Use 3–24 letters, numbers, or underscores.';input.focus();return;}
 if(!client){error.textContent='Account saving is not connected yet.';return;}
 submit.disabled=true;submit.textContent='Saving…';error.textContent='';
 try{
  const result=user?await client.auth.updateUser({data:{username}}):await client.auth.signInAnonymously({options:{data:{username}}});
  if(result.error)throw result.error;
  if(!result.data.user)throw new Error('The account could not be saved.');
  user=result.data.user;updateAccount();closeAccount();
 }catch(err){error.textContent=/anonymous.*disabled|anonymous.*not allowed/i.test(err.message)?'Username signup is not enabled yet. Please try again later or continue as a guest.':'Could not save your username. Please try again or continue as a guest.';}
 finally{submit.disabled=false;submit.textContent='Continue';}
});

async function start(){
 const regions=[document.querySelector('header'),document.querySelector('main')];regions.forEach(el=>el.inert=true);
 const connection=connect();
 await delay(reduced?100:950);
 intro.classList.add('loading');intro.setAttribute('aria-label','Loading Lyric Stage');
 await Promise.all([connection,delay(reduced?100:950)]);
 intro.classList.add('finished');await delay(reduced?0:450);intro.remove();
 regions.forEach(el=>el.inert=false);updateAccount();
 if(!user?.user_metadata?.username)openAccount();
}
start().catch(()=>{intro.remove();document.querySelector('header').inert=false;document.querySelector('main').inert=false;openAccount();});
