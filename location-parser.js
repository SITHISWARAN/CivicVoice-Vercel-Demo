// Location extraction shared by the conversation API and focused tests.
export function stripDurationPhrase(value) {
  return String(value || '')
    .replace(/\b(?:for|since|lasting|lasted|from)\s+(?:the\s+)?(?:last\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|few|couple of)\s+(?:days?|weeks?|months?|years?|naal|naala|naatkal|vaaram|varam|vaarama|varama|vaaralu|maasam|maasama|maasamga|நாளா|நாட்கள்?|வாரமா|வாரங்கள்?|மாதங்கள்?|రోజులుగా|రోజులు?|వారాలుగా|వారాలు?)(?:\s+ago)?\b.*$/i, '')
    .replace(/\s+(?:for|since)\s+.+$/i, '')
    .replace(/[,.!?;]+$/g, '')
    .trim();
}

function isGenericLocationLead(value) {
  return /^(?:our|my|the|this|that|enga|engal|namma|mana|எங்கள்|எங்க|நம்ம|நமது|என்|எனது|இந்த|அந்த|మా|మన|ನಮ್ಮ|ನನ್ನ)$/i.test(String(value || '').trim());
}

export function looksLikePlace(value) {
  const s = String(value || '').trim();
  if (s.length < 4 || s.length > 130 || isGenericLocationLead(s)) return false;
  if (/^(?:our|my|the|this|that)\s+(?:street|area|road)$/i.test(s)) return false;
  if (/^(?:எங்கள்|எங்க|நம்ம|நமது|என்|எனது|இந்த|அந்த)\s+(?:தெரு|பகுதி|சாலை|வீதி|தெருவில்|தெருவில|பகுதியில்|சாலையில்|வீதியில்)$/iu.test(s)) return false;
  if (/^(?:మా|మన|నా|ఈ|ఆ)\s+(?:వీధి|వీధిలో|రోడ్డు|రోడ్డులో|ప్రాంతం|ప్రాంతంలో|నగరం|నగరంలో)$/u.test(s)) return false;
  if (/^(?:ನಮ್ಮ|ನನ್ನ|ಈ|ಆ)\s+(?:ರಸ್ತೆ|ರಸ್ತೆಯಲ್ಲಿ|ಪ್ರದೇಶ|ಪ್ರದೇಶದಲ್ಲಿ|ಬೀದಿ|ಬೀದಿಯಲ್ಲಿ)$/u.test(s)) return false;
  if (/^(?:मेरी|मेरे|हमारी|हमारे|इस|उस)\s+(?:गली|सड़क|इलाके)(?:\s+में)?$/u.test(s)) return false;
  return /\d|street|st\.?\b|road|rd\.?\b|nagar|colony|layout|ward|area|avenue|cross|main|bus stop|school|temple|market|junction|chennai|vijayawada|hyderabad|madurai|coimbatore|trichy|salem|vellore|tirupati|guntur|vizag|visakhapatnam|தமிழ்நாடு|தெரு|நகர்|சாலை|பகுதி|பேருந்து நிலையம்|வீதி|రోడ్డు|వీధి|నగర్|కాలనీ|ప్రాంతం|బస్టాండ్|జంక్షన్/i.test(s);
}

export function extractLocationFromNarrative(text, findPresetLocation = () => null) {
  const raw = String(text || '').trim();
  const preset = findPresetLocation(raw);
  if (preset) return preset.displayName;

  // Tamil/Telugu often put the street name BEFORE the locative suffix:
  // "அண்ணா நகர் 2வது தெருவில்". Do not treat "எங்கள் தெருவில்" as an address.
  const nativeSuffix = raw.match(/([\p{L}\p{N}][\p{L}\p{M}\p{N}\s.'-]{1,70}?)\s*(தெருவில்|தெருவில|நகரில்|பகுதியில்|சாலையில்|வீதியில்|వీధిలో|రోడ్డులో|ప్రాంతంలో|నగరంలో)(?=\s|$|[,;.!?])/u);
  if (nativeSuffix) {
    const lead = nativeSuffix[1].trim().replace(/\s+/g, ' ');
    if (!isGenericLocationLead(lead)) {
      const suffix = nativeSuffix[2];
      const suffixBase = ({
        'தெருவில்': 'தெரு', 'தெருவில': 'தெரு', 'நகரில்': 'நகர்', 'பகுதியில்': 'பகுதி', 'சாலையில்': 'சாலை', 'வீதியில்': 'வீதி',
        'వీధిలో': 'వీధి', 'రోడ్డులో': 'రోడ్డు', 'ప్రాంతంలో': 'ప్రాంతం', 'నగరంలో': 'నగరం'
      })[suffix] || suffix;
      const candidate = stripDurationPhrase(`${lead} ${suffixBase}`);
      if (looksLikePlace(candidate)) return candidate;
    }
  }

  const patterns = [
    /\b(?:located at|location is|address is|street is|area is|near|around|at|in)\s+(.+?)(?=\s+(?:for|since|lasting|lasted|because|and the issue|it has been|it's been)\b|\s+\d+\s*(?:days?|weeks?|months?|years?)\b|[,.!?;]|$)/i,
    /(?:என் புகார் இருக்கும் இடம்|பிரச்சினை இருக்கும் இடம்|இடம்|முகவரி)\s*[:：]?\s*(.+?)(?=\s+(?:for|since)\b|[,.!?;]|$)/i,
    /(?:సమస్య ఉన్న ప్రదేశం|లొకేషన్|చిరునామా)\s*[:：]?\s*(.+?)(?=\s+(?:for|since)\b|[,.!?;]|$)/i
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    const candidate = stripDurationPhrase(match[1]);
    if (looksLikePlace(candidate) && !/^(?:our|my|enga|engal|mana|the|this|that)\s+(?:street|area|road)$/i.test(candidate)) return candidate;
  }
  return '';
}

export function removeNumericDurationFromLocation(text) {
  return stripDurationPhrase(String(text || '').replace(/\b(?:this is at|the location is|location is|it is at|at|near|in|இடம்|இருப்பிடம்|స్థలం)\s+/i, '').trim());
}
