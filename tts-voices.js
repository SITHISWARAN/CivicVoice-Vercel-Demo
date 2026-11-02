// Keep each default inside Gnani Timbre v2.5's language-appropriate voice catalogue.
// A blank or mismatched .env value falls back safely so every synthesis request has a voice.
export const TTS_VOICE_OPTIONS = Object.freeze({
  'ta-IN': ['Asmita', 'Trisha', 'Brinda', 'Vedika', 'Noopur'],
  'te-IN': ['Suhana', 'Lehara', 'Lavanya', 'Yukti', 'Varuni'],
  'hi-IN': ['Nalini', 'Bhavna', 'Yashvi', 'Urmila', 'Jwala', 'Chitra', 'Ambuja', 'Deepak', 'Roopesh', 'Vikrant', 'Hemraj', 'Jalaj', 'Omkar'],
  'hi-Latn': ['Poorvi'],
  'kn-IN': ['Saanvi', 'Kavin'],
  'en-IN': ['Kaveri', 'Trupti', 'Devika', 'Pranav', 'Shlok', 'Girish']
});

export const DEFAULT_TTS_VOICES = Object.freeze({
  'ta-IN': 'Brinda',
  'te-IN': 'Yukti',
  'hi-IN': 'Nalini',
  'hi-Latn': 'Poorvi',
  'kn-IN': 'Kavin',
  'en-IN': 'Kaveri'
});

export function resolveTtsVoice(env, envName, languageProfile) {
  const defaultVoice = DEFAULT_TTS_VOICES[languageProfile];
  const options = TTS_VOICE_OPTIONS[languageProfile] || [];
  const configured = String(env?.[envName] || '').trim();
  return options.includes(configured) ? configured : defaultVoice;
}
