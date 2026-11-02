import Busboy from 'busboy';
import ffmpegPath from 'ffmpeg-static';
import {execFile} from 'node:child_process';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
const execFileAsync=promisify(execFile);
function parseMultipart(req){return new Promise((resolve,reject)=>{const bb=Busboy({headers:req.headers,limits:{files:1,fileSize:12*1024*1024}});let audio=null,language='ta-IN';bb.on('field',(n,v)=>{if(n==='language')language=v});bb.on('file',(name,file,info)=>{if(name!=='audio'){file.resume();return;}const chunks=[];file.on('data',d=>chunks.push(d));file.on('end',()=>audio={buffer:Buffer.concat(chunks),mime:info.mimeType});});bb.on('finish',()=>resolve({audio,language}));bb.on('error',reject);req.pipe(bb);});}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.GNANI_API_KEY;if(!key)return res.status(503).json({error:'GNANI_API_KEY is not configured'});
 let tempDir;
 try{
  const {audio,language}=await parseMultipart(req);if(!audio?.buffer?.length)return res.status(400).json({error:'No audio file received.'});
  const allowed=new Set(['ta-IN','te-IN','hi-IN','kn-IN','en-IN']);const selected=allowed.has(language)?language:'ta-IN';
  tempDir=await fs.mkdtemp(path.join(os.tmpdir(),'civicvoice-'));const input=path.join(tempDir,'input.webm');const output=path.join(tempDir,'converted.wav');await fs.writeFile(input,audio.buffer);
  await execFileAsync(ffmpegPath,['-y','-i',input,'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',output],{timeout:40000,maxBuffer:2*1024*1024});
  const wav=await fs.readFile(output);const form=new FormData();form.append('audio_file',new Blob([wav],{type:'audio/wav'}),'civicvoice.wav');form.append('language_code',selected);form.append('format','transcribe');form.append('itn_native_numerals','false');
  form.append('bias_list',JSON.stringify(['streetlight','street light','water supply','water leakage','garbage collection','pothole','drainage','blocked drain','sewage overflow','stormwater flooding','power outage','traffic signal','footpath damage','mosquito nuisance','fallen tree','public toilet','complaint','Nagar','Chennai','Anna Nagar','theru vilakku','kuppai','veedhi','neellu','thanni','sakkadai','kuzhi','டிரைனேஜ்','சாக்கடை','தண்ணீர் வரவில்லை','பெரிய பள்ளம்','மழைநீர் தேக்கம்','గుంత','డ్రైనేజ్','गड्ढा','नाली जाम','ಗುಂಡಿ','ಚರಂಡಿ ಮುಚ್ಚಿದೆ','ಕಸ']));form.append('bias_score','1.0');
  const upstream=await fetch(process.env.GNANI_STT_URL||'https://api.vachana.ai/stt/v3',{method:'POST',headers:{'X-API-Key-ID':key},body:form,signal:AbortSignal.timeout(45000)});const raw=await upstream.text();let body;try{body=JSON.parse(raw)}catch{body={raw}};if(!upstream.ok)throw new Error(body?.error?.message||body?.detail||body?.message||`GNANI STT failed (${upstream.status})`);const transcript=String(body?.transcript||body?.text||body?.data?.transcript||'').trim();if(!transcript)throw new Error('GNANI returned no transcript.');return res.json({transcript,language:selected,languageMode:'selected',requestId:body.request_id||body.requestId||null});
 }catch(e){console.error('STT:',e);return res.status(502).json({error:`Could not process audio: ${e.message}`});}finally{if(tempDir)await fs.rm(tempDir,{recursive:true,force:true}).catch(()=>{});}
}
