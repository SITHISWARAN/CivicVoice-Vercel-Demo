// Heuristic language-candidate ranking for Gnani's one-language-per-request STT API.
// This does not translate or rewrite the transcript; it only chooses among returned candidates.
const TOKENS = {
  tamilRoman: [
    'thanni', 'thanneer', 'theru', 'vilakku', 'kuppai', 'sakkadai', 'saakkadai',
    'varala', 'varale', 'varavilla', 'irukku', 'aagala', 'eriyala', 'vaaram',
    'naal', 'romba', 'sollunga', 'pannunga', 'venum', 'pakkam', 'edukkala',
    'kuzhi', 'nadapathai', 'theruvilakku', 'velai', 'seiyala', 'thollai'
  ],
  teluguRoman: [
    'neellu', 'neeru', 'raavatledu', 'raaledu', 'veedhi', 'deepam', 'cheppandi',
    'ekkada', 'samasya', 'kaavali', 'kavali', 'avvatledu', 'daggara', 'guntalu',
    'chetta', 'teesukellatledu', 'domalu', 'pani', 'padipoyindi', 'murugu',
    'ledu', 'kalva', 'kaluva', 'vaaralu', 'velagadam', 'undi', 'undhi',
    'prablam', 'prabblem', 'prablem', 'cheyatledu', 'avvatledu'
  ],
  // Do not score generic English words such as "problem" as Hindi evidence; they
  // occur in Telugu-English and Tamil-English code-mixed speech too.
  hindi: ['namaste', 'bataiye', 'batao', 'aap', 'meri', 'mere', 'nahi', 'sadak', 'paani', 'kachra', 'gaddha', 'naali', 'hai', 'hain', 'mein', 'bijli', 'band', 'tooti', 'shikayat', 'jagah'],
  kannada: ['namaskara', 'samasye', 'neeru', 'kasa', 'gundhi', 'raste', 'deepa', 'bidda', 'naali', 'vidyut', 'shikayathu', 'sthal'],
  english: [
    'the', 'is', 'are', 'was', 'were', 'has', 'have', 'not', 'working', 'near',
    'street', 'road', 'water', 'supply', 'leaking', 'garbage', 'pothole', 'drain',
    'complaint', 'please', 'location', 'problem', 'issue', 'signal', 'power', 'broken'
  ]
};

function normalizeTranscript(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function countCodePoints(text, regex) {
  return Array.from(text.matchAll(regex)).length;
}

function countLexicalHits(text, words) {
  let hits = 0;
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = text.match(new RegExp(`(?:^|[^a-z])${escaped}(?=$|[^a-z])`, 'g'));
    if (matches) hits += Math.min(matches.length, 2);
  }
  return hits;
}

export function scoreTranscriptCandidate(value, language) {
  const text = normalizeTranscript(value);
  if (text.length < 3) return -50;

  const tamilChars = countCodePoints(text, /[\u0B80-\u0BFF]/gu);
  const teluguChars = countCodePoints(text, /[\u0C00-\u0C7F]/gu);
  const hindiChars = countCodePoints(text, /[\u0900-\u097F]/gu);
  const kannadaChars = countCodePoints(text, /[\u0C80-\u0CFF]/gu);
  const latinChars = countCodePoints(text, /[a-z]/gu);
  const taHits = countLexicalHits(text, TOKENS.tamilRoman);
  const teHits = countLexicalHits(text, TOKENS.teluguRoman);
  const enHits = countLexicalHits(text, TOKENS.english);
  const hiHits = countLexicalHits(text, TOKENS.hindi);
  const knHits = countLexicalHits(text, TOKENS.kannada);
  const civicTerms = /street.?light|vilakku|theru|veedhi|water|thanni|neellu|kuppai|குப்பை|தண்ணீர்|விளக்கு|చెత్త|నీరు|వీధి|குழி|గుంత|drainage|sakkadai|சாக்கடை|மின்தடை|విద్యుత్|దోమ/i.test(text);

  // A small readability baseline is shared so length alone cannot win language selection.
  const baseline = Math.min(text.length, 120) / 30 + Math.min(latinChars, 36) / 24;
  let score = baseline;

  if (language === 'ta-IN') {
    score += tamilChars * 2.7 - teluguChars * 7.5;
    score += taHits * 8.5 - teHits * 5.5;
    if (tamilChars) score += 3;
  } else if (language === 'te-IN') {
    score += teluguChars * 2.7 - tamilChars * 7.5;
    score += teHits * 8.5 - taHits * 5.5;
    // Recognize common Telugu-English phrasing without mistaking the English word
    // "problem" by itself for evidence of Hindi.
    if (/\b(?:problem|issue)\s+ga\s+(?:undi|undhi)\b/i.test(text)) score += 7;
    if (teluguChars) score += 3;
  } else if (language === 'hi-IN') {
    score += hiHits * 8.0 + hindiChars * 2.7 - teluguChars * 7 - tamilChars * 7 - kannadaChars * 5;
    if (latinChars >= 8 && hiHits >= 1) score += 2;
    if (hindiChars) score += 3;
  } else if (language === 'kn-IN') {
    score += knHits * 8.0 + kannadaChars * 2.7 - teluguChars * 7 - tamilChars * 7 - hindiChars * 5;
    if (latinChars >= 8 && knHits >= 1) score += 2;
    if (kannadaChars) score += 3;
  } else if (language === 'en-IN') {
    score += enHits * 1.4;
    score -= (tamilChars + teluguChars) * 7;
    // Latin-script code-mixed speech is supported, but native Tamil/Telugu script is stronger evidence.
    score -= Math.max(taHits, teHits) * 1.8;
    if (latinChars >= 8 && !taHits && !teHits) score += 2;
  }

  if (civicTerms) score += 1.25;
  if (text.length < 6) score -= 1.5;
  return score;
}
