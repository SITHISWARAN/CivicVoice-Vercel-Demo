export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.GNANI_API_KEY;
  if(!key) return res.status(503).json({error:'GNANI_API_KEY is not configured'});
  try{
    const {text,language='ta-IN',voiceProfile}=req.body||{};
    if(!String(text||'').trim()) return res.status(400).json({error:'Text is required for speech synthesis.'});
    if(String(text).length>1200) return res.status(400).json({error:'Text is too long.'});
    const voices={'ta-IN':process.env.GNANI_TTS_VOICE_TA,'te-IN':process.env.GNANI_TTS_VOICE_TE,'hi-IN':process.env.GNANI_TTS_VOICE_HI,'kn-IN':process.env.GNANI_TTS_VOICE_KN,'en-IN':process.env.GNANI_TTS_VOICE_EN,'hi-Latn':process.env.GNANI_TTS_VOICE_HINGLISH};
    const voiceKey=voiceProfile==='hi-Latn'&&language==='hi-IN'?'hi-Latn':language;
    const voice=voices[voiceKey]||voices[language];
    const upstream=await fetch(process.env.GNANI_TTS_URL||'https://api.vachana.ai/api/v1/tts/inference',{method:'POST',headers:{'X-API-Key-ID':key,'Content-Type':'application/json'},body:JSON.stringify({text:String(text).trim(),model:process.env.GNANI_TTS_MODEL||'timbre-v2.5',language,...(voice?{voice}:{}),speed:Number(process.env.GNANI_TTS_SPEED||1.15),audio_config:{sample_rate:Number(process.env.GNANI_TTS_SAMPLE_RATE||48000),bitrate:process.env.GNANI_TTS_BITRATE||'128k',container:'mp3'}}),signal:AbortSignal.timeout(45000)});
    if(!upstream.ok){const msg=(await upstream.text()).slice(0,700);return res.status(upstream.status).json({error:`GNANI TTS failed (${upstream.status}): ${msg}`});}
    const audio=Buffer.from(await upstream.arrayBuffer());
    if(!audio.length) return res.status(502).json({error:'GNANI returned empty audio.'});
    res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Length',String(audio.length));return res.status(200).send(audio);
  }catch(e){console.error(e);return res.status(502).json({error:`Could not reach GNANI TTS: ${e.message}`});}
}
