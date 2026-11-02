// Shared conversation-language detection for typed text and STT transcripts.
// Native scripts win over noisy per-utterance STT language scores. Romanized
// Tamil/Telugu/Hindi are preserved as Tanglish/Telugish/Hinglish response modes.
const NATIVE_SCRIPTS = [
  { language: 'ta-IN', regex: /[\u0B80-\u0BFF]/gu },
  { language: 'te-IN', regex: /[\u0C00-\u0C7F]/gu },
  { language: 'hi-IN', regex: /[\u0900-\u097F]/gu },
  { language: 'kn-IN', regex: /[\u0C80-\u0CFF]/gu },
];

const ROMANIZED = {
  'ta-Latn': [
    /\b(?:irukku|irukka|irukkaa|theru|theruvil|naala|naal|pannunga|varala|varale|varavilla|eriyala|eriyale|sakkadai|saakkadai|thanni|thanneer|vilakku|aagala|aagudhu|engal|enga|pakkathula|venum|sollunga|kuppai|kuzhi|thollai|nadapathai|maadhiri|maathiri|illa|illai)\b/gu,
  ],
  'te-Latn': [
    /\b(?:undi|undhi|cheppandi|ekkada|daggara|meeru|mee|kaadu|avvatledu|raavatledu|nunchi|kaluva|kalva|murugu|neellu|veedhi|prablam|prabblem|prablem|ledu|rojulu|roju|kaavali|kavali|cheyatledu|pani|maalo|mana)\b/gu,
    /\b(?:problem|issue|drainage)\s+ga\s+(?:undi|undhi)\b/gu,
  ],
  'hi-Latn': [
    /\b(?:namaste|bataiye|batao|aap|mujhe|meri|mere|hamare|hamari|nahi|nahin|paani|sadak|kaunsi|chahiye|kachra|gaddha|naali|bijli|shikayat|jagah|samajh|theek|gali|kharaab|kharab|din|se|mein|hai|hain|ho raha|ho rahi)\b/gu,
    /\b(?:problem|issue|drainage|streetlight)\s+(?:hai|hain)\b/gu,
  ],
  // There is no separate Kannada-Latin voice option. Detect romanized Kannada
  // as Kannada, so the conversation remains in Kannada script and voice.
  'kn-IN': [
    /\b(?:namaskara|samasye|neeru|kasa|gundhi|raste|deepa|bidda|naali|vidyut|shikayathu|sthal|namma|nanna|beku|agide|illa|hege|yaava)\b/gu,
  ],
};

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

export function inferLanguageFromTranscript(transcript) {
  const value = String(transcript || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/gu, '').trim();
  if (!value) return null;

  const nativeCounts = NATIVE_SCRIPTS.map(({ language, regex }) => ({ language, count: countMatches(value, regex) }))
    .sort((a, b) => b.count - a.count);
  const [winner, runner = { count: 0 }] = nativeCounts;
  if (winner.count >= 2 && winner.count >= Math.max(2, runner.count * 1.35)) return winner.language;

  const latin = value.toLowerCase();
  const romanScores = Object.entries(ROMANIZED).map(([language, patterns]) => ({
    language,
    score: patterns.reduce((total, pattern) => total + Math.min(3, countMatches(latin, pattern)), 0),
  })).sort((a, b) => b.score - a.score);
  const [romanWinner, romanRunner = { score: 0 }] = romanScores;
  if (romanWinner.score >= 1 && romanWinner.score > romanRunner.score) return romanWinner.language;

  // Leave unmarked Latin text unresolved here. Typed English is resolved to en-IN
  // by resolveInitialConversationLanguage; STT Latin text may still be romanized
  // local speech and should be allowed to use its STT candidate as evidence.
  return winner.count > 0 ? winner.language : null;
}

// Short conversational UI responses used after map/location actions. Keeping
// these here prevents Latin-script modes from accidentally receiving native-script replies.
export function localizedClientMessage(language, key, details = {}) {
  const place = details.place || 'this location';
  const map = {
    'ta-IN': {
      locationSelected: `வரைபடத்தில் ${place} இடத்தைத் தேர்ந்தெடுத்துள்ளேன். பின் சரியான இடத்தில் உள்ளதா என்று உறுதிப்படுத்துங்கள்.`,
      geocodeFound: 'இந்த இடத்தை வரைபடத்தில் கண்டுபிடித்துள்ளேன். பின் சரியான இடத்தில் உள்ளதா என்று உறுதிப்படுத்துங்கள்.',
      geocodeNotFound: 'அந்த இடத்தைக் கண்டுபிடிக்க முடியவில்லை. அருகிலுள்ள அடையாளத்தைச் சொல்லுங்கள் அல்லது வரைபடத்தில் பின்னைத் தேர்ந்தெடுங்கள்.',
      gpsFailed: 'இருப்பிடத்தைப் பெற முடியவில்லை. முகவரியைச் சொல்லலாம் அல்லது வரைபடத்தில் பின்னைத் தேர்ந்தெடுக்கலாம்.',
      speechFailed: 'மன்னிக்கவும், உங்கள் பேச்சைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
      conversationFailed: 'மன்னிக்கவும், இந்தப் படியைச் செயல்படுத்த முடியவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது விவரங்களைத் திருத்தவும்.'
    },
    'ta-Latn': {
      locationSelected: `Map-la ${place} select pannirukken. Pin correct location-la irukka-nu confirm pannunga.`,
      geocodeFound: 'Indha address map-la kidaichirukku. Pin correct location-la irukka-nu check panni confirm pannunga.',
      geocodeNotFound: 'Andha location kidaikkala. Pakkathula irukkura landmark sollunga illa map-la pin select pannunga.',
      gpsFailed: 'Ungal location kidaikkala. Address sollunga illa map-la pin select pannunga.',
      speechFailed: 'Mannikkavum, unga pecha purinjukka mudiyala. Thirumba try pannunga.',
      conversationFailed: 'Mannikkavum, indha step process aagala. Thirumba try pannunga illa details edit pannunga.'
    },
    'te-IN': {
      locationSelected: `మ్యాప్‌లో ${place} గుర్తించాను. పిన్ సరైన చోటుందో చూసి నిర్ధారించండి.`,
      geocodeFound: 'ఈ ప్రదేశాన్ని మ్యాప్‌లో కనుగొన్నాను. పిన్ సరైనదో చూసి నిర్ధారించండి.',
      geocodeNotFound: 'ఆ ప్రదేశాన్ని కనుగొనలేకపోయాను. దగ్గరలోని గుర్తు చెప్పండి లేదా మ్యాప్‌లో పిన్ పెట్టండి.',
      gpsFailed: 'మీ లొకేషన్ పొందలేకపోయాను. చిరునామా చెప్పండి లేదా మ్యాప్‌లో పిన్ పెట్టండి.',
      speechFailed: 'క్షమించండి, మీ మాటలను గుర్తించలేకపోయాను. మళ్లీ ప్రయత్నించండి.',
      conversationFailed: 'క్షమించండి, ఈ దశను ప్రాసెస్ చేయలేకపోయాను. మళ్లీ ప్రయత్నించండి లేదా వివరాలను సవరించండి.'
    },
    'te-Latn': {
      locationSelected: `Map-lo ${place} select chesanu. Pin correct place-lo undho check chesi confirm cheyyandi.`,
      geocodeFound: 'Ee address map-lo dorikindi. Pin correct place-lo undho check chesi confirm cheyyandi.',
      geocodeNotFound: 'Aa place dorakaledu. Daggaralo unna landmark cheppandi leka map-lo pin select cheyyandi.',
      gpsFailed: 'Mee location dorakaledu. Address cheppandi leka map-lo pin select cheyyandi.',
      speechFailed: 'Kshaminchandi, mee maatala artham kaaledu. Malli try cheyyandi.',
      conversationFailed: 'Kshaminchandi, ee step process kaaledu. Malli try cheyyandi leka details edit cheyyandi.'
    },
    'hi-IN': {
      locationSelected: `मैप पर ${place} की जगह चुनी है। कृपया पिन देखकर पुष्टि करें कि जगह सही है।`,
      geocodeFound: 'यह जगह मैप पर मिल गई है। कृपया पिन देखकर पुष्टि करें कि स्थान सही है।',
      geocodeNotFound: 'वह जगह नहीं मिली। पास का लैंडमार्क बताएं या मैप पर पिन चुनें।',
      gpsFailed: 'आपकी लोकेशन नहीं मिल पाई। पता बताएं या मैप पर पिन चुनें।',
      speechFailed: 'माफ़ कीजिए, आपकी बात समझ नहीं आई। कृपया फिर से कोशिश करें।',
      conversationFailed: 'माफ़ कीजिए, यह चरण पूरा नहीं हो पाया। दोबारा कोशिश करें या विवरण संपादित करें।'
    },
    'hi-Latn': {
      locationSelected: `Map par ${place} select kiya hai. Pin sahi jagah par hai ya nahi, confirm kijiye.`,
      geocodeFound: 'Ye address map par mil gaya hai. Pin check karke confirm kijiye.',
      geocodeNotFound: 'Woh jagah nahi mili. Paas ka landmark bataiye ya map par pin chuniye.',
      gpsFailed: 'Aapki location nahi mil paayi. Address bataiye ya map par pin chuniye.',
      speechFailed: 'Maaf kijiye, aapki baat samajh nahi aayi. Dobara try kijiye.',
      conversationFailed: 'Maaf kijiye, ye step complete nahi hua. Dobara try kijiye ya details edit kijiye.'
    },
    'kn-IN': {
      locationSelected: `ನಕ್ಷೆಯಲ್ಲಿ ${place} ಆಯ್ಕೆ ಮಾಡಿದ್ದೇನೆ. ಪಿನ್ ಸರಿಯಾದ ಸ್ಥಳದಲ್ಲಿದೆಯೇ ಎಂದು ದೃಢೀಕರಿಸಿ.`,
      geocodeFound: 'ಈ ಸ್ಥಳ ನಕ್ಷೆಯಲ್ಲಿ ಕಂಡುಬಂದಿದೆ. ಪಿನ್ ಸರಿಯಾದ ಸ್ಥಳದಲ್ಲಿದೆಯೇ ಎಂದು ದೃಢೀಕರಿಸಿ.',
      geocodeNotFound: 'ಆ ಸ್ಥಳ ಸಿಗಲಿಲ್ಲ. ಹತ್ತಿರದ ಗುರುತು ಹೇಳಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಪಿನ್ ಆಯ್ಕೆ ಮಾಡಿ.',
      gpsFailed: 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಪಡೆಯಲಾಗಲಿಲ್ಲ. ವಿಳಾಸ ಹೇಳಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಪಿನ್ ಆಯ್ಕೆ ಮಾಡಿ.',
      speechFailed: 'ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಮಾತು ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      conversationFailed: 'ಕ್ಷಮಿಸಿ, ಈ ಹಂತವನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ವಿವರಗಳನ್ನು ತಿದ್ದಿ.'
    },
    'en-IN': {
      locationSelected: `I selected ${place} on the map. Please confirm the pin is correct.`,
      geocodeFound: 'I found a possible location. Please check the map pin and confirm it is correct.',
      geocodeNotFound: 'I could not find that exact place. Try a nearby landmark or select a pin on the map.',
      gpsFailed: 'I could not get your location. Please say the address or choose a pin manually.',
      speechFailed: 'Sorry, I could not transcribe that recording. Please try again.',
      conversationFailed: 'Sorry, I could not process that step. Please retry or edit the details manually.'
    }
  };
  const keyLanguage = map[language] ? language
    : language.startsWith('ta') ? 'ta-IN'
      : language.startsWith('te') ? 'te-IN'
        : language.startsWith('hi') ? 'hi-IN'
          : language.startsWith('kn') ? 'kn-IN' : 'en-IN';
  return map[keyLanguage][key] || map['en-IN'][key] || 'Please try again.';
}


export function resolveInitialConversationLanguage(transcript, recognizedLanguage = null, activeLanguage = 'ta-IN') {
  return inferLanguageFromTranscript(transcript)
    || recognizedLanguage
    || (/[A-Za-z]/u.test(String(transcript || '')) ? 'en-IN' : activeLanguage || 'ta-IN');
}
