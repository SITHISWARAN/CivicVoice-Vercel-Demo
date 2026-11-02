// Language-aware parsing for duration and yes/no replies in the complaint flow.
const NUMBER_WORDS = [
  [10, ['ten', 'pathu', 'paththu', 'பத்து', 'పది', 'दस', 'ಹತ್ತು']],
  [9, ['nine', 'onpathu', 'ஒன்பது', 'తొమ్మిది', 'नौ', 'ಒಂಬತ್ತು']],
  [8, ['eight', 'ettu', 'எட்டு', 'ఎనిమిది', 'आठ', 'ಎಂಟು']],
  [7, ['seven', 'ezhu', 'ஏழு', 'ఏడు', 'सात', 'ಏಳು']],
  [6, ['six', 'aaru', 'ஆறு', 'ఆరు', 'छह', 'छः', 'ಆರು']],
  [5, ['five', 'anju', 'ainthu', 'ஐந்து', 'ఐదు', 'पाँच', 'पांच', 'ಐದು']],
  [4, ['four', 'naalu', 'நான்கு', 'నాలుగు', 'चार', 'ನಾಲ್ಕು']],
  [3, ['three', 'moon', 'moonu', 'மூன்று', 'మూడు', 'तीन', 'ಮೂರು']],
  [2, ['two', 'rendu', 'irandu', 'ரெண்டு', 'இரண்டு', 'రెండు', 'दो', 'ಎರಡು']],
  [1, ['one', 'oru', 'ஒன்று', 'ஒரு', 'ஒருகை', 'ఒకటి', 'ఒక', 'एक', 'ಒಂದು']],
];

const NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  oru: 1, rendu: 2, irandu: 2, moonu: 3, naalu: 4, anju: 5, aaru: 6, ezhu: 7, ettu: 8, onpathu: 9, pathu: 10,
  'ஒரு': 1, 'ஒன்று': 1, 'இரண்டு': 2, 'ரெண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
  'ఒకటి': 1, 'ఒక': 1, 'రెండు': 2, 'రెండూ': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಎಂಟು': 8, 'ಒಂಬತ್ತು': 9, 'ಹತ್ತು': 10,
};

function boundaryPattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'u');
}

export function parseBareNumber(text) {
  const value = String(text || '').normalize('NFKC').trim().toLowerCase();
  if (/^\d{1,4}$/u.test(value)) return Number(value);
  return Object.prototype.hasOwnProperty.call(NUMBERS, value) ? NUMBERS[value] : null;
}

function parseNumberWord(text) {
  const value = String(text || '').normalize('NFKC').toLowerCase();
  const numeric = value.match(/(?:^|[^\p{N}])(\d{1,4})(?=$|[^\p{N}])/u);
  if (numeric) return Number(numeric[1]);
  for (const [number, words] of NUMBER_WORDS) {
    if (words.some(word => boundaryPattern(word).test(value))) return number;
  }
  return null;
}

function durationForUnit(number, text) {
  const value = String(text || '').normalize('NFKC').toLowerCase();
  if (/(?:year|years|saal|varusham|வருட|సంవత్సర|साल|वर्ष|ವರ್ಷ)/u.test(value)) return { text: `${number} year${number === 1 ? '' : 's'}`, days: number * 365 };
  if (/(?:month|months|mahina|mahine|maheene|maasam|மாத|నెల|महीना|महीने|महीनों|माह|ತಿಂಗಳ|ತಿಂಗಳು)/u.test(value)) return { text: `${number} month${number === 1 ? '' : 's'}`, days: number * 30 };
  if (/(?:week|weeks|hafta|hafte|vaaram|varam|vaaralu|vaara|வார|వారం|వారాల|हफ्ता|हफ्ते|हफ्तों|सप्ताह|ವಾರ|ವಾರಗಳು)/u.test(value)) return { text: `${number} week${number === 1 ? '' : 's'}`, days: number * 7 };
  if (/(?:day|days|din|dina|naal|naala|naatkal|நாள்|நாட்|நாள|రోజు|రోజుల|రోజులు|दिन|दिना|ದಿನ|ದಿನಗಳು|roju|rojulu)/u.test(value)) return { text: `${number} day${number === 1 ? '' : 's'}`, days: number };
  return null;
}

export function parseDuration(text) {
  const value = String(text || '').normalize('NFKC').toLowerCase();
  const number = parseNumberWord(value);
  return number == null ? null : durationForUnit(number, value);
}

export function isDurationUnitOnly(text) {
  return /^(?:days?|weeks?|months?|years?|naal|naala|naatkal|vaaram|varam|vaaralu|maasam|maasama|maasamga|mahina|mahine|mahinaon|hafta|hafte|din|dina|roju|rojulu|nela|nelalu|दिन|दिनों|हफ्ता|हफ्ते|हफ्तों|महीना|महीने|महीनों|साल|वर्ष|ದಿನ|ದಿನಗಳು|ವಾರ|ವಾರಗಳು|ತಿಂಗಳು|ತಿಂಗಳುಗಳು|நாள்|நாட்கள்|நாட்களாக|நாளாக|வாரம்|வாரங்கள்|வாரமாக|மாதம்|மாதங்கள்|மாதமாக|రోజు|రోజులు|రోజులుగా|వారం|వారాలు|నెల|నెలలు)$/u.test(String(text || '').normalize('NFKC').trim().toLowerCase());
}

export function parseDurationUnitOnly(text, number) {
  const unit = String(text || '').normalize('NFKC').trim().toLowerCase();
  if (!isDurationUnitOnly(unit)) return null;
  return durationForUnit(Number(number), unit);
}

export function parseYesNo(text) {
  const value = String(text || '').normalize('NFKC').toLowerCase().trim().replace(/[.,!?;:]+/gu, '').replace(/\s+/gu, ' ');
  if (/^(?:yes|yeah|yep|correct|confirm|submit|save|okay|ok|avunu|avunandi|aama|amam|seri|sari|haan|han|haanji|bilkul|sahi|pakka|haudu|howdu|ಹೌದು|ಆಯಿತು|ಚೆನ್ನಾಗಿದೆ|ஆமா|ஆமாம்|ஆம்|சரி|ஓகே|கண்டிப்பா|அப்படித்தான்|అవును|సరే|అవునండి|అవునా|हाँ|हां|जी हाँ|ठीक है|सही है|होय|okay save|ஆம் சேமி)$/u.test(value) || /^(?:yes|yeah|okay|confirm|save|submit)\b/u.test(value)) return true;
  if (/^(?:no|nope|cancel|don't|dont|vendam|vendaam|illa|illai|ledu|lēdu|nahi|nahin|nhi|mat|na|ಬೇಡ|ಇಲ್ಲ|ಅಲ್ಲ|வேண்டாம்|இல்லை|அல்ல|కాదు|లేదు|వద్దు|రద్దు|नहीं|नही|मत|न|नको)$/u.test(value) || /^(?:no|cancel|nahi|nahin|nhi)\b/u.test(value)) return false;
  return null;
}
