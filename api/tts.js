export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GNANI_API_KEY;

  if (!API_KEY) {
    return res.status(503).json({ error: 'GNANI_API_KEY is not configured' });
  }

  try {
    const {
      text,
      language = 'ta-IN',
      voiceProfile
    } = req.body || {};

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const voices = {
      'ta-IN': process.env.GNANI_TTS_VOICE_TA,
      'te-IN': process.env.GNANI_TTS_VOICE_TE,
      'hi-IN': process.env.GNANI_TTS_VOICE_HI,
      'kn-IN': process.env.GNANI_TTS_VOICE_KN,
      'en-IN': process.env.GNANI_TTS_VOICE_EN
    };

    const voiceKey =
      voiceProfile === 'hi-Latn' && language === 'hi-IN'
        ? 'hi-IN'
        : language;

    const voice = voices[voiceKey];

    const response = await fetch(
      process.env.GNANI_TTS_URL ||
      'https://api.vachana.ai/api/v1/tts/inference',
      {
        method: 'POST',
        headers: {
          'X-API-Key-ID': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim(),
          model: process.env.GNANI_TTS_MODEL || 'timbre-v2.5',
          language,
          ...(voice ? { voice } : {}),
          speed: 1.15,
          audio_config: {
            sample_rate: 48000,
            bitrate: '128k',
            container: 'mp3'
          }
        })
      }
    );

    if (!response.ok) {
      const message = await response.text();

      console.error('GNANI TTS:', response.status, message);

      return res.status(response.status).json({
        error: `GNANI TTS failed (${response.status}): ${message.slice(0, 500)}`
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    if (!audio.length) {
      return res.status(502).json({
        error: 'GNANI returned empty audio'
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).send(audio);

  } catch (error) {
    console.error('TTS error:', error);

    return res.status(502).json({
      error: `Could not reach GNANI TTS: ${error.message}`
    });
  }
}