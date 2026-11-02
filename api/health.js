export default function handler(req,res){
  res.status(200).json({ok:true,apiKeyConfigured:Boolean(process.env.GNANI_API_KEY),sttEndpoint:process.env.GNANI_STT_URL||'https://api.vachana.ai/stt/v3',ttsEndpoint:process.env.GNANI_TTS_URL||'https://api.vachana.ai/api/v1/tts/inference',workflow:'civic-complaint-demo',database:'none'});
}
