// Deterministic multilingual classifier. Scores rank evidence; they are not probabilities.
function normalizeComplaintText(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ').trim();
}

export function classifyComplaint(text) {
  const s = normalizeComplaintText(text);
  const tests = [
    ['Drainage', /\b(?:drain(?:age)?|sewer(?:age)?|sewage|gutter|sakkadai|sakkada|kalvai|kaluva|murugu|drain\s*(?:is\s*)?(?:blocked|block|clogged|overflowing)|blocked\s*drain|drainage\s*(?:problem|block|blocked|issue))\b|டிரைனேஜ்|ட்ரைனேஜ்|டிரைனேஜு|(?:டிரைனேஜ்|ட்ரைனேஜ்|சாக்கடை|வடிகால்).{0,18}(?:பிளாக்|ப்ளாக்|பிளாக்காக|ப்ளாக்காக|ப்ராப்ளம்|பிரச்சினை)|பிரச்சினை.*(?:சாக்கடை|வடிகால்)|கழிவுநீர்|வடிகால்|மழைநீர் வடிகால்|சாக்கடை|சாக்கடை அடைப்பு|அடைஞ்சு|அடைச்சு|அடைந்து|தேங்கிய கழிவுநீர்|முருகு|(?:ட்ரெயினும்?|டிரெயினும்?|ட்ரெய்னும்?|டிரைனும்?).{0,24}(?:அடச்சு|அடச்சி|அடைச்சு|அடைச்சி|அடஞ்சு|அடைஞ்சு|அடைஞ்சிரு|அடைந்து|அடைத்த|பிளாக்|ப்ளாக்|மூடிக்கிடக்க)|ட்ரெயின்|டிரெயின்|ட்ரெய்ன்|டிரைன்|ட్రైనేజ్|డ్రైనేజ్|డ్రైనేజీ|డ్రైనేజి|డ్రెయినేజ్|డ్రెయినేజీ|డ్రెయిన్|మురుగు|మురుగునీరు|కాలువ|డ్రైన్ బ్లాక్|కాలువ పొంగి|డ్రైనేజీ బ్లాక్/i],
    ['Open manhole', /\b(?:open manhole|uncovered manhole|missing manhole cover|manhole cover missing|broken manhole cover|open sewer hole|open drain cover|missing drain cover|uncovered sewer|open drainage hole)\b|மூடி இல்லாத மேன்ஹோல்|திறந்த மேன்ஹோல்|மேன்ஹோல் மூடி இல்லை|மேன்ஹோல் மூடி உடைந்து|பாதாள சாக்கடை மூடி இல்லை|சாக்கடை மூடி இல்லை|திறந்து கிடக்கும் மேன்ஹோல்|திறந்த பாதாள சாக்கடை|மூடி இல்லாத வடிகால்|மேன் ஹோல் மூடி இல்லை|మ్యాన్.?హోల్ మూత లేదు|తెరిచి ఉన్న మ్యాన్.?హోల్|మ్యాన్ హోల్ తెరిచి ఉంది|మ్యాన్.?హోల్ మూత విరిగింది|డ్రెయిన్ మూత లేదు|తెరిచి ఉన్న డ్రెయిన్/i],
    ['Water leakage', /\b(?:water\s*(?:pipe\s*)?(?:leak(?:ing)?|leakage)|pipe\s*(?:leak|burst)|tap\s*(?:leak|drip)|leaking\s*tap|water\s*is\s*leaking|thanni.{0,30}(?:leak|oduthu|waste)|neellu.{0,30}(?:leak|karustunnayi)|neeti\s*leak)\b|நீர் கசிவு|தண்ணீர் கசிவு|குழாய் கசிவு|குழாய் உடைஞ்சு|குழாயில் இருந்து தண்ணீர்|தண்ணீர் வீணாக|నీటి లీక్|పైపు లీక్|నీళ్లు కారుతున్నాయి|నీరు కారుతోంది|కుళాయి లీక్/i],

    ['Water supply', /\b(?:no\s+water(?:\s+supply)?|water\s+supply|no\s+water\s+coming|low\s+water\s+pressure|water\s+not\s+coming|water\s+shortage|tap\s+is\s+dry|no\s+drinking\s+water|thanni\s+varala|thanni\s+varavillai|neellu\s+raavatledu)\b|தண்ணீர் வரவில்லை|தண்ணீர் வரல|குடிநீர் இல்லை|குடிநீர் வரவில்லை|தண்ணீர் விநியோகம்|தண்ணீர் சப்ளை|தண்ணீர் வரல|தண்ணி வரல|நீர் வரவில்லை|குடிநீர் தட்டுப்பாடு|నీరు రావడం లేదు|నీళ్లు రావడం లేదు|నీటి సరఫరా|మంచినీరు రావడం లేదు|నీటి కొరత/i],
    ['Water quality', /\b(?:dirty drinking water|contaminated water|water contamination|water quality|muddy water|yellow water|brown water|bad[- ]smelling water|water smells bad|water has a foul smell|water tastes bad|drinking water.{0,36}(?:muddy|dirty|yellow|brown|foul smell|bad smell|contaminated))\b|குடிநீர் தரம்|குடிநீர் அழுக்கு|அழுக்கு குடிநீர்|கலங்கலான தண்ணீர்|மஞ்சள் நிற தண்ணீர்|தண்ணீரில் துர்நாற்றம்|குடிநீரில் துர்நாற்றம்|தண்ணீர் அசுத்தம்|குடிநீர் மாசு|குடிநீர் மாசடைந்தது|தண்ணி மஞ்சளா வருது|నీటిని తాగడానికి వీలులేదు|తాగునీటి నాణ్యత|కలుషిత నీరు|మురికి నీరు|పసుపు నీరు|నీటికి దుర్వాసన|నీరు కలుషితం|నీళ్లు మురికిగా వస్తున్నాయి/i],
    ['Stormwater flooding', /\b(?:waterlogging|water\s*logging|flood(?:ing)?|rainwater\s+(?:is\s+)?(?:stuck|standing|collecting)|stormwater\s+(?:overflow|flood)|road\s+(?:is\s+)?flooded)\b|மழைநீர் தேக்கம்|மழைநீர் தேங்க|தண்ணீர் தேங்க|தண்ணீர் தேங்கி|வெள்ளம்|சாலையில் தண்ணீர்|மழையால் தண்ணீர்|மழை.{0,80}(?:ரோடு|ரோட்டில்|சாலை|சாலையில்|தெரு|தெருவில்).{0,60}(?:தண்ணி|தண்ணீர்|நீர்).{0,24}(?:நிக்குது|நிற்குது|தேங்குது|தேங்கிக்கிடக்குது|தேங்குகிறது|நிக்கிறது)|ரோடு.{0,28}(?:ஃபுல்லாக|புல்லாக|முழுக்க|முழுவதும்).{0,24}(?:தண்ணி|தண்ணீர்|நீர்).{0,24}(?:நிக்குது|நிற்குது|தேங்குது|நிக்கிறது)|தண்ணி\s*(?:நிக்குது|நிற்குது|தேங்குது)|నీరు నిలిచిపోయింది|వర్షపు నీరు|వరద|రోడ్డుపై నీరు నిల్వ/i],
    ['Streetlight', /street\s*light|streetlight|lamp\s*post|street lamp|road light|light\s*(?:is\s*)?(?:broken|not working|not work|off|not glowing)|light.{0,60}(?:work aagala|work agala|vela seiyala|velai seiyala|eriyala|velagatledu|pani cheya(?:t)?ledu|sari illa|doesn't work|not working|not glowing)|theru\s*(?:light|vilakku)|theruvilakku|veedhi\s*(?:deepam|light)|light eriyala|current ledu.*light|தெரு.?விளக்கு|ஸ்ட்ரீட்\s*லைட்ட?ு?|விளக்கு|லைட்|லைட்டு|எரியல|எரியலை|எரியவில்லை|எரிய மாட்ட|எரியமாட்ட|எரியாம|வேலை செய்யல|வேலை செய்யலை|வேலை செய்யவில்லை|தெருவிளக்கு|వీధి దీపం|వీధిలైట్|లైట్ పని చేయడం లేదు|లైట్ వెలగడం లేదు|వెలగడం లేదు|स्ट्रीट\s*लाइट|स्ट्रीटलाइट|सड़क.{0,18}(?:लाइट|बत्ती)|गली की बत्ती|लाइट.{0,35}(?:काम नहीं|नहीं जल|बंद है|खराब है|नहीं जलती|नहीं जल रहा)|बत्ती.{0,35}(?:नहीं जल|बंद है|खराब है)|बीदी\s*दीप|बीड़ी लाइट|ಬೀದಿ\s*(?:ದೀಪ|ಲೈಟ್)|ರಸ್ತೆ\s*(?:ದೀಪ|ಲೈಟ್)|ದೀಪ.{0,32}(?:ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ|ಬೆಳಗುತ್ತಿಲ್ಲ|ಆರಿದೆ|ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ)|ಲೈಟ್.{0,32}(?:ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ|ಬೆಳಗುತ್ತಿಲ್ಲ|ಆರಿದೆ)/i],
    ['Garbage', /\b(?:garbage|rubbish|waste collection|trash|dustbin|dumping|litter|kuppai|kuppa|kuppai.{0,25}(?:edukkala|remove pannala|irukku|poduranga))\b|குப்பை|கழிவு|கொட்டியிருக்க|குப்பை எடுக்க|குப்பை அகற்ற|குப்பை தேங்கி|திடக்கழிவு|చెత్త|చెత్త కుప్ప|చెత్త వేయ|చెత్త తీసుకెళ్లడం లేదు|క్లీన్ చేయలే/i],
    ['Illegal dumping', /\b(?:illegal dumping|dumped waste|waste dumped illegally|rubbish dumped|unauthorized dumping|unauthorised dumping|someone is dumping waste|garbage dumped illegally|illegal garbage dumping)\b|சட்டவிரோதமாக குப்பை கொட்ட|அனுமதியின்றி குப்பை கொட்ட|தெருவில் குப்பை கொட்டுகிறார்கள்|குப்பையை சட்டவிரோதமாக கொட்ட|இங்கு குப்பை கொட்டுகிறார்கள்|அனுமதியில்லாமல் கழிவு கொட்ட|அகற்றாத குப்பையை கொட்டி|అక్రమంగా చెత్త వేయడం|అక్రమంగా చెత్త వేస్తున్నారు|చెత్త అక్రమంగా వేస్తున్నారు|అనుమతి లేకుండా చెత్త పారవేయడం|రోడ్డుపై చెత్త వేస్తున్నారు|ఇక్కడ చెత్త పారేస్తున్నారు/i],
    ['Pothole', /\bpotholes?\b|\broad\s+(?:has\s+a\s+)?hole\b|road-la hole|road lo guntalu|road me gaddha|\bguntalu\b|சாலை பள்ளம்|ரோட்டில் பள்ளம்|சாலையில் குழி|ரோடு பள்ளம்|சாலையில் பெரிய குழி|గుంత|రోడ్డుపై గుంత|రోడ్డులో గుంత/i],
    ['Road damage', /\b(?:road\s*(?:damage|damaged|broken|cracked|cracks|surface|repair)|damaged\s+road|broken\s+road|road\s+repair|loose\s+gravel)\b|சாலை சேதம்|ரோடு உடைஞ்சு|சாலை உடைந்த|தார் சாலை சேதம்|రోడ్డు దెబ్బ|రోడ్డు పాడైంది|రోడ్డు మరమ్మతు/i],
    ['Road obstruction', /\b(?:road blocked|blocked road|roadway obstruction|obstruction on (?:the )?road|object blocking (?:the )?road|debris\s+(?:is\s+)?blocking (?:the )?road|object\s+(?:is\s+)?blocking (?:the )?road|something\s+(?:is\s+)?blocking (?:the )?road|road is impassable|road access blocked)\b|சாலையில் தடங்கல்|ரோட்டில் தடை|சாலையை மறித்து|சாலையில் பொருள் கிடக்கிறது|சாலை மறிப்பு|சாலை அடைப்பு|ரோடு பிளாக் ஆகி|ரோட்டில் வழி இல்லை|రోడ్డుపై అడ్డంకి|రోడ్డు బ్లాక్ అయింది|రోడ్డును అడ్డుకున్న|రోడ్డుపై వస్తువులు|దారి మూసుకుపోయింది/i],
    ['Road signage', /\b(?:missing road sign|road sign missing|damaged road sign|broken traffic sign|missing street name board|street name board\s+(?:is\s+)?missing|street name sign missing|damaged signboard|no road signage|faded road sign)\b|சாலை பெயர் பலகை இல்லை|தெரு பெயர் பலகை இல்லை|பெயர் பலகை உடைந்து|சாலை குறியீட்டு பலகை சேதம்|போக்குவரத்து பலகை உடைந்து|பெயர்பலகை தெரியவில்லை|రోడ్డు గుర్తు బోర్డు లేదు|వీధి పేరు బోర్డు లేదు|రోడ్ సైన్ పాడైంది|ట్రాఫిక్ బోర్డు విరిగింది/i],
    ['Illegal parking', /\b(?:illegal parking|wrong parking|vehicles? parked on (?:the )?footpath|car parked on (?:the )?footpath|vehicle blocking (?:the )?(?:road|driveway|entrance)|cars? blocking (?:the )?entrance|parked vehicle blocking|no-parking violation|vehicle parked illegally)\b|நடைபாதையில் வண்டி நிறுத்தி|தவறான பார்க்கிங்|தவறாக வண்டி நிறுத்தி|ரோட்டில் வண்டி நிறுத்தி வழி மறிக்கிறது|வாசலை மறித்து வண்டி நிறுத்தி|நோ பார்க்கிங் இடத்தில் வண்டி|ఫుట్.?పాత్.{0,20}వాహనాలు పార్క్ చేశారు|తప్పు పార్కింగ్|రోడ్డును బ్లాక్ చేసేలా వాహనాలు|గేటు ముందు వాహనం పెట్టారు/i],
    ['Footpath damage', /\b(?:footpath|sidewalk|pavement|pavement\s+broken|broken\s+tiles)\b|நடைபாதை|நடை பாதை|நடைபாதை சேதம்|நடைபாதை உடைந்து|ఫుట్‌పాత్|నడకదారి|ఫుట్ పాత్/i],
    ['Power outage', /\b(?:power\s*(?:cut|outage|failure)|electricity\s*(?:cut|outage|failure)|no\s+power|no\s+electricity|current\s+cut|current\s+ledu)\b|மின்தடை|கரண்ட் இல்லை|மின்சாரம் இல்லை|மின்சாரம் வரவில்லை|கரண்ட் கட்|విద్యుత్ అంతరాయం|కరెంట్ లేదు|పవర్ కట్/i],
    ['Traffic signal', /\b(?:traffic\s*signal|signal\s+(?:not working|broken|failure)|traffic\s+light)\b|சிக்னல் வேலை செய்ய|போக்குவரத்து சிக்னல்|சிக்னல் பழுது|ట్రాఫిక్ సిగ్నల్|సిగ్నల్ పని చేయడం లేదు/i],
    ['Public toilet', /\b(?:public\s+toilet|public\s+restroom|public\s+bathroom|toilet\s+(?:dirty|broken|closed|no water))\b|பொது கழிப்பறை|கழிப்பறை சுத்தம்|கழிப்பறையில் தண்ணீர் இல்லை|మరుగుదొడ్డి|పబ్లిక్ టాయిలెట్/i],
    ['Public transport facility', /\b(?:bus stop|bus shelter|bus stand|bus-stop shelter)\b.{0,36}\b(?:broken|damaged|roof|shelter|dirty|unsafe|maintenance|repair|missing)\b|\b(?:broken|damaged|unsafe)\s+(?:bus stop|bus shelter|bus stand)\b|பேருந்து நிறுத்தம் உடைந்த|பஸ் ஸ்டாப் உடைந்து|பேருந்து நிழற்கூடம் சேதம்|பேருந்து நிழற்கூடம் சேதமடைந்த|பஸ் ஸ்டாப் கூரை இல்லை|பேருந்து நிறுத்தம் பராமரிப்பு|బస్ స్టాప్ పాడైంది|బస్ షెల్టర్ దెబ్బతింది|బస్ స్టాప్ పైకప్పు లేదు|బస్ స్టాప్ మరమ్మతు/i],
    ['Mosquito nuisance', /\b(?:mosquito(?:es)?|mosquito\s+problem|stagnant\s+water|vector\s+control)\b|கொசு|கொசுக்கள்|கொசு தொல்லை|கொசு அதிகம்|நீர் தேக்கம்.*கொசு|దోమలు|దోమల సమస్య|దోమల బెడద/i],
    ['Stray animals', /\b(?:stray\s+(?:dog|dogs|animal|animals|cattle)|injured\s+(?:dog|animal)|cattle\s+on\s+the\s+road|dog\s+menace)\b|தெரு நாய்|தெருநாய்|நாய்கள் தொல்லை|காயமடைந்த நாய்|கால்நடை சாலையில்|వీధి కుక్క|వీధి జంతువులు|గాయపడిన కుక్క/i],
    ['Fallen tree', /\b(?:fallen\s+tree|tree\s+(?:fallen|fell|branch|branches|blocking)|uprooted\s+tree|tree\s+debris)\b|மரம் விழுந்து|விழுந்த மரம்|மரக்கிளை விழுந்து|மரம் சாலையில்|చెట్టు పడిపోయింది|విరిగిన చెట్టు కొమ్మ/i],
    ['Construction debris', /\b(?:construction\s+debris|building\s+debris|rubble|construction\s+waste|building\s+material\s+blocking)\b|கட்டிடக் கழிவு|கட்டுமானக் கழிவு|கட்டிடப் பொருட்கள் சாலையில்|கல் மண் குவியல்|నిర్మాణ వ్యర్థాలు|కట్టడాల చెత్త/i],
    ['Noise nuisance', /\b(?:noise\s*(?:nuisance|complaint|problem)|loud\s+music|excessive\s+noise|late\s+night\s+noise|construction\s+noise)\b|ஒலி மாசு|அதிக சத்தம்|இரவில் சத்தம்|சத்தத் தொல்லை|శబ్ద కాలుష్యం|ఎక్కువ శబ్దం|రాత్రి శబ్దం/i],
    ['Air pollution', /\b(?:air pollution|smoke pollution|thick smoke|toxic smoke|dust pollution|burning garbage|burning waste|factory smoke|smoke from factory|bad air quality)\b|காற்று மாசு|காற்று மாசுபாடு|புகை மாசு|அதிக புகை|குப்பை எரிக்கிறார்கள்|குப்பை எரிக்கிறாங்க|தூசி மாசு|புகையால் மூச்சுத் திணறல்|வாகன புகை|వాయు కాలుష్యం|గాలి కాలుష్యం|చెత్త కాలుస్తున్నారు|పొగ ఎక్కువగా వస్తోంది|దుమ్ము కాలుష్యం|ఫ్యాక్టరీ పొగ/i],
    ['Park maintenance', /\b(?:park\s+(?:maintenance|dirty|unclean|equipment|playground)|playground\s+(?:broken|damage))\b|பூங்கா பராமரிப்பு|பூங்கா சுத்தம்|விளையாட்டு உபகரணம் உடைந்து|పార్క్ నిర్వహణ|పార్క్ శుభ్రత/i],
    ['Public infrastructure', /\b(?:broken public bench|damaged public bench|broken railing|damaged railing|broken public staircase|damaged public facility|broken street furniture|public bench broken|public bench\s+(?:is\s+)?broken|public tap damaged|community hall damaged)\b|பொது பெஞ்ச் உடைந்து|இரும்பு தடுப்பு உடைந்து|பொது படிக்கட்டு சேதம்|பொது வசதி சேதம்|பொது இருக்கை உடைந்து|சாலை ஓர தடுப்பு உடைந்து|పబ్లిక్ బెంచ్ విరిగింది|రైలింగ్ దెబ్బతింది|ప్రజా సదుపాయం పాడైంది|పబ్లిక్ మెట్లు దెబ్బతిన్నాయి/i],
    ['Public safety', /\b(?:exposed wire|electric shock|danger|dangerous|unsafe|fire hazard|accident hazard)\b|தீ|ஆபத்து|ஆபத்தான|பயம்|மின்கம்பி|வெளியே தெரியும் கம்பி|ప్రమాదం|వైర్ బయట|అపాయం|కరెంట్ షాక్/i]
  ];
  const scores = new Map();
  const evidence = new Map();
  const addEvidence = (category, rawText, points, source = 'phrase match') => {
    const current = scores.get(category) || 0;
    if (points > current) {
      scores.set(category, points);
      evidence.set(category, { text: String(rawText || '').slice(0, 90), source });
    }
  };
  // Ignore explicit non-issues, but inspect every occurrence so a later positive
  // mention ("not a pothole here, but there is one on the next street") still counts.
  const isNegatedMention = (match, category) => {
    if (!match || typeof match.index !== 'number') return false;
    const before = s.slice(Math.max(0, match.index - 48), match.index);
    const after = s.slice(match.index + match[0].length, match.index + match[0].length + 72);

    // These entities use "no X" to mean X is absent; "no water" is intentionally
    // not included because that is a water-supply complaint.
    if (['Pothole', 'Mosquito nuisance', 'Stray animals', 'Fallen tree', 'Garbage', 'Public safety'].includes(category)
      && /\b(?:no|without|never)\s+(?:(?:any|a|an|the)\s+)?$/i.test(before)) return true;
    if (/(?:\bnot\s+(?:(?:really|actually)\s+)?(?:(?:a|an|the)\s+)?|\brather than\s+(?:(?:a|an|the)\s+)?|\bnot related to\s+)$/i.test(before)) return true;

    // Explicitly healthy/normal states are not active civic complaints.
    if (category === 'Drainage' && /^(?:\s)*(?:is\s+)?(?:not\s+(?:blocked|clogged|overflowing)|flowing\s+normally|working\s+fine|clear now|fine now)|^\s*(?:சீராக|சரியாக|நன்றாக).{0,18}(?:செல்கிறது|ஓடுகிறது|இயங்குகிறது)|^\s*(?:அடைப்பு இல்லை|அடைக்கப்படவில்லை)|^\s*(?:బ్లాక్ కాలేదు|మామూలుగా ప్రవహిస్తోంది)/i.test(after)) return true;
    if (category === 'Streetlight' && /^(?:\s)*(?:is\s+)?(?:working(?:\s+fine|\s+now)?|works\s+fine|functioning\s+normally|fixed|on and working)|^\s*(?:இப்போது எரிகிறது|சரியாக எரிகிறது|வேலை செய்கிறது)|^\s*(?:ఇప్పుడు వెలుగుతోంది|పని చేస్తోంది)|^\s*(?:ठीक है|सही काम कर रही है|काम कर रही है|जल रही है|चालू है)|^\s*(?:ಸರಿಯಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತಿದೆ|ಕೆಲಸ ಮಾಡುತ್ತಿದೆ|ಬೆಳಗುತ್ತಿದೆ|ಚಾಲು ಇದೆ)/i.test(after)) return true;
    if (category === 'Traffic signal' && /^(?:\s)*(?:is\s+)?(?:working(?:\s+fine|\s+now)?|functioning normally|fixed)/i.test(after)) return true;
    if (category === 'Water leakage' && /^(?:\s)*(?:is\s+)?not\s+(?:leaking|leaking anymore)|^\s*(?:கசிவு இல்லை|கசியவில்லை)|^\s*(?:లీక్ కావడం లేదు)/i.test(after)) return true;
    if (category === 'Water supply' && /^(?:\s)*(?:is\s+)?(?:working\s+normally|working\s+fine|restored now)|^\s*(?:சீராக வருகிறது|வந்துவிட்டது)|^\s*(?:సరిగ్గా వస్తోంది|వచ్చింది)/i.test(after)) return true;
    if (category === 'Water quality' && /(?:\b(?:drinking )?water\s+(?:is\s+)?not\s+(?:dirty|muddy|yellow|brown|contaminated)|\bnot\s+(?:dirty|muddy|yellow|brown|contaminated)\s+(?:drinking )?water|தண்ணீர்\s+(?:அழுக்காக இல்லை|அசுத்தமாக இல்லை)|குடிநீர்\s+(?:அழுக்காக இல்லை|மாசில்லை)|నీరు\s+(?:మురికిగా లేదు|కలుషితం కాదు)|నీళ్లు\s+(?:మురికిగా లేవు|కలుషితం కాదు))/i.test(s) && !/(?:foul smell|smells? bad|bad taste|துர்நாற்றம்|மோசமான வாசனை|దుర్వాసన)/i.test(s)) return true;
    if (category === 'Stormwater flooding' && /^(?:\s)*(?:is\s+)?not\s+(?:flooding|standing|collecting)|^\s*(?:தேங்கவில்லை|நிற்கவில்லை|வடிய்ந்து விட்டது)|^\s*(?:నిల్వ లేదు|నీరు వెళ్లిపోయింది)/i.test(after)) return true;
    if (category === 'Pothole' && /^(?:\s)*(?:is\s+)?(?:not present|absent|fixed)|^\s*(?:இல்லை|இல்ல|குழி இல்லை)|^\s*(?:లేదు|లేవు)/i.test(after)) return true;
    if (category === 'Mosquito nuisance' && /^(?:\s)*(?:are\s+)?(?:not present|gone|under control)|^\s*(?:இல்லை|குறைந்துவிட்டது)|^\s*(?:లేవు|తగ్గాయి)/i.test(after)) return true;
    if (category === 'Public safety' && /^(?:\s)*(?:is\s+)?not\s+(?:dangerous|unsafe)|^\s*(?:ஆபத்து இல்லை|பாதுகாப்பாக உள்ளது)|^\s*(?:ప్రమాదం లేదు|సురక్షితం)/i.test(after)) return true;

    return false;
  };
  const findPositiveMatch = (re, category) => {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    let best = null;
    let bestSpecificity = -Infinity;
    for (const match of s.matchAll(new RegExp(re.source, flags))) {
      if (isNegatedMention(match, category)) continue;
      const phrase = String(match[0] || '').trim();
      const length = Array.from(phrase).length;
      // Prefer a complete symptom phrase over a generic word such as "light".
      const generic = /^(?:light|water|road|issue|விளக்கு|லைட்|லைட்டு|தண்ணீர்|నీరు)$/i.test(phrase);
      const specificity = length - (generic ? 8 : 0);
      if (specificity > bestSpecificity) {
        best = match;
        bestSpecificity = specificity;
      }
    }
    return best;
  };

  // Existing Tamil/Telugu/English rules are evaluated together instead of returning
  // whichever rule happened to appear first in the source file.
  for (const [category, re] of tests) {
    const match = findPositiveMatch(re, category);
    if (!match) continue;
    const matchedText = match[0] || '';
    const lengthScore = Math.min(Array.from(matchedText).length / 8, 2.1);
    let score = 1.85 + lengthScore;
    if (/^(?:light|water|road|issue|விளக்கு|தண்ணீர்|నీరు)$/i.test(matchedText.trim())) score -= 0.6;
    addEvidence(category, matchedText, score, 'multilingual phrase match');
  }

  // Add frequent spoken-code and transliteration spellings seen in Tamil-English
  // (Tanglish) and Telugu-English (Telugish). The model never rewrites the transcript.
  const spokenVariants = [
    ['Illegal dumping', /\b(?:illegally\s+dumping\s+(?:waste|garbage|rubbish|trash)|illegal\s+(?:waste|garbage|rubbish|trash)\s+dumping|(?:waste|garbage|rubbish)\s+(?:is\s+being\s+)?dumped\s+illegally|illegal\s+dumping\s+of\s+(?:waste|garbage|rubbish))\b/i, 5.2],
    ['Drainage', /\b(?:drainage|drainage\s+(?:problem|issue)|drainage\s+(?:problem|issue)\s+(?:ga\s+)?(?:undi|undhi)|drain\s+(?:problem|issue)|sakkadai|saakkadai|sakkada|kalvai|kaluva|murugu)\b|டிரைனேஜ்|ட்ரைனேஜ்|சாக்கடை|வடிகால்|டிரைனேஜ்\s*ப்ராப்ளம்|டிரைனேஜ்\s*பிரச்சினை|డ్రైనేజ్|డ్రైనేజీ|డ్రైనేజి|డ్రెయినేజ్|డ్రెయినేజీ|డ్రెయిన్|మురుగునీరు|కాలువ|డ్రైనేజ్.{0,20}(?:ప్రాబ్లం|ప్రాబ్లమ్|సమస్య)|డ్రైనేజీ.{0,20}(?:ప్రాబ్లం|ప్రాబ్లమ్|సమస్య)/i, 4.6],
    ['Water leakage', /\b(?:water\s+(?:pipe\s+)?(?:is\s+)?leaking|pipe\s+(?:is\s+)?leaking|water\s+leak(?:ing)?|leaking\s+pipe)\b|\b(?:thanni|thanneer|tanni|neellu|neeru)\b.{0,28}\b(?:leak(?:ing)?|leakage|karustundi|karustunnayi|oduthu|pipe burst)\b|\b(?:leak|leaking)\b.{0,24}\b(?:thanni|thanneer|tanni|neellu|neeru)\b/i, 3.8],
    ['Water supply', /\b(?:thanni|thanneer|tanni)\s+(?:varala|varale|varalae|varavilla|varavillai)\b|\b(?:neellu|neeru)\s+(?:raavatledu|raaledu|raavadam ledu)\b/i, 3.7],
    ['Water quality', /\b(?:thanni|thanneer|tanni|neellu|neeru)\b.{0,30}\b(?:dirty|yellow|muddy|bad smell|smell)\b|\b(?:dirty|yellow|muddy)\s+(?:thanni|thanneer|neellu|neeru)\b|தண்ணி மஞ்சளா வருது|నీళ్లు మురికిగా వస్తున్నాయి/i, 3.75],
    ['Open manhole', /\b(?:manhole|drain)\s+(?:cover\s+)?(?:missing|open|broken)\b|\bopen\s+manhole\b|சாக்கடை மூடி இல்லை|மூடி இல்லாத மேன்ஹோல்|ம్యాన్.?హోల్ మూత లేదు/i, 4.0],
    ['Illegal dumping', /\b(?:illegal|unauthorized|unauthorised)\s+dumping\b|\bgarbage\s+(?:dumped|dumping)\s+(?:here|illegally)\b|சட்டவிரோதமாக குப்பை கொட்ட|அனுமதியின்றி குப்பை கொட்ட|அక్రమంగా చెత్త వేస్తున్నారు/i, 3.9],
    ['Illegal parking', /\b(?:wrong parking|illegal parking|parked on the footpath|vehicle blocking the entrance)\b|நடைபாதையில் வண்டி நிறுத்தி|தவறு பார்க்கிங்|తప్పు పార్కింగ్/i, 3.8],
    ['Road signage', /\b(?:missing road sign|street name board missing|damaged road sign|broken traffic sign)\b|தெரு பெயர் பலகை இல்லை|రోడ్డు గుర్తు బోర్డు లేదు/i, 3.7],
    ['Air pollution', /\b(?:air pollution|burning garbage|smoke pollution|factory smoke|dust pollution)\b|காற்று மாசு|குப்பை எரிக்கிறாங்க|వాయు కాలుష్యం/i, 3.7],
    ['Public transport facility', /\b(?:bus stop|bus shelter|bus stand)\b.{0,30}\b(?:broken|damaged|repair|roof|missing)\b|பஸ் ஸ்டாப் உடைந்து|బస్ స్టాప్ పాడైంది/i, 3.6],
    ['Stormwater flooding', /\b(?:mazhai\s*(?:neer|thanni)|rain\s*water|water\s*logging|waterlogging|vellam|road\s*flooded|water\s+(?:is\s+)?standing|standing water|water\s+is\s+collecting|water\s+on\s+the\s+road)\b|மழைநீர் தேக்கம்|நீர்தேக்கம்|వర్షపు నీరు|వరద/i, 3.8],
    ['Streetlight', /\b(?:theru\s*vilakku|theruvilakku|veedhi\s*(?:light|deepam)|light\s+(?:eriyala|eriyale|velagala|velagatledu)|vilakku\s+eriyala)\b/i, 3.7],
    ['Garbage', /\b(?:kuppai|kuppa|kuppay|chetta)\b.{0,30}\b(?:edukkala|edukala|remove pannala|collect cheyyaledu|teesukellatledu|piled up|overflowing)\b|\b(?:kuppai|kuppa|chetta)\b/i, 3.45],
    ['Pothole', /\b(?:road[- ]la|road[- ]lo|road me)\s+(?:kuzhi|gunt(?:a|alu)|hole)\b|\b(?:kuzhi irukku|guntalu unnayi)\b/i, 3.6],
    ['Road damage', /\b(?:road|roadu)\s+(?:is\s+)?(?:cracked|broken|damaged|damage|padaindi|poyindi|has cracks|needs repair)\b|சாலை சேதம்|రోడ్డు పాడైంది/i, 3.7],
    ['Footpath damage', /\b(?:footpath|sidewalk)\s+(?:broken|damaged|cracked)\b|நடைபாதை உடைந்து|నడకదారి దెబ్బతింది/i, 3.5],
    ['Power outage', /\b(?:current\s+(?:ledu|leedu|illa|cut)|power\s+(?:cut|outage)|karant\s+ledu)\b|கரண்ட் இல்லை|మిన్తடை|కరెంట్ లేదు/i, 3.65],
    ['Traffic signal', /\b(?:signal\s+(?:work avvatledu|pani cheyyatledu|work aagala|not working))\b/i, 3.5],
    ['Mosquito nuisance', /\b(?:kosu|kosugal|doma|domalu)\s*(?:thollai|ekkuva|problem|bedada)?\b/i, 3.25],
    ['Stray animals', /\b(?:theru nai|street dog|veedhi kukka|veedhi kukkalu)\b/i, 3.35],
    ['Fallen tree', /\b(?:maram\s+(?:vizhundh|vizhundhu)|chettu\s+padipoyindi|fallen tree)\b/i, 3.5],
    ['Noise nuisance', /\b(?:romba satham|adhiga satham|ekkuva sound|night\s+noise|loud music)\b|அதிக சத்தம்|ఎక్కువ శబ్దం/i, 3.35],
    ['Public toilet', /\b(?:public toilet|public restroom|toilet dirty|toilet clean cheyyaledu)\b|பொது கழிப்பறை|పబ్లిక్ టాయిలెట్/i, 3.4],
    ['Construction debris', /\b(?:construction waste|building debris|rubble|construction debris)\b|கட்டுமானக் கழிவு|నిర్మాణ వ్యర్థాలు/i, 3.4],
    ['Park maintenance', /\b(?:park dirty|park maintenance|playground broken)\b|பூங்கா சுத்தம்|పార్క్ శుభ్రత/i, 3.4],
    ['Public safety', /\b(?:exposed wire|electric shock|fire hazard|accident hazard|dangerous obstruction)\b|வெளியே தெரியும் கம்பி|కరెంట్ షాక్/i, 3.7]
  ];
  for (const [category, re, score] of spokenVariants) {
    const match = findPositiveMatch(re, category);
    if (match) addEvidence(category, match[0], score, 'spoken / transliterated variant');
  }

  // Extra high-signal coverage for Hindi, Hinglish, Kannada, and common ASR/code-mix
  // spellings. These rules supplement the broad catalogue above; they do not infer
  // a complaint from generic words such as only "road" or "water".
  const multilingualCoverage = [
    ['Pothole', /\b(?:gaddha|gaddhe|gaddhon|pallam|pallangal|kuzhi|gunta|guntu|guntalu)\b|गड्ढा|गड्ढे|गड्ढों|गड्ढा पड़ा|सड़क.{0,22}गड्ढा|ಗುಂಡಿ|ಗುಂಡಿಗಳು|ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ|ದೊಡ್ಡ ಗುಂಡಿ|சாலையில் பள்ளம்|பெரிய பள்ளம்|ரோட்டில் பள்ளம்|ரோட்டில் குழி|పెద్ద గుంత|రోడ్డుపై గుంత|రోడ్డులో గుంత/i, 6.2],
    ['Water leakage', /\b(?:pipe\s*line|pipeline|pipe|tap)\b.{0,38}\b(?:leak(?:ing|age)?|leak\s+ho\s+raha|leak\s+aagudhu|leak\s+avutondi|karutunnayi|sorikeyaaguttide)\b|\b(?:water|paani|pani|thanni|thanneer|neellu|neeru)\b.{0,32}\b(?:leak(?:ing|age)?|leaking|leak\s+ho\s+raha|kasivu|karustondi)\b|पाइप.{0,28}(?:लीक|रिसाव|टपक|बह रहा)|पाइपलाइन.{0,28}(?:लीक|रिसाव|टपक)|पानी.{0,24}(?:लीक|रिसाव|बह रहा|टपक)|(?:लीक|रिसाव).{0,26}(?:पानी|पाइप|लाइन)|नल.{0,25}(?:टपक|लीक|रिसाव)|ನೀರಿನ.{0,24}(?:ಪೈಪ್|ಕೊಳವೆ).{0,24}(?:ಸೋರಿಕೆ|ಲೀಕ್)|(?:ಪೈಪ್|ಕೊಳವೆ).{0,24}(?:ಸೋರಿಕೆ|ಲೀಕ್)|ನೀರು ಸೋರಿಕೆ|குழாய்.{0,25}(?:கசிவு|ஒழுகு|லீக்)|குழாயி.{0,25}(?:கசிவு|ஒழுகு|லீக்)|குழாயில்.{0,25}(?:கசிவு|ஒழுகு|லீக்)|தண்ணீர்.{0,25}கசிவு|குழாயில் இருந்து தண்ணீர்|தண்ணீர் பைப்.{0,20}(?:லீக்|கசிவு)|నీటి.{0,24}పైప.{0,24}(?:లీక్|కార)|పైపులైన.{0,24}లీక్|పైపు.{0,24}(?:లీక్|కారుతోంది)/i, 6.3],
    ['Water supply', /पानी नहीं आ रहा|पानी नहीं मिल रहा|पानी की सप्लाई नहीं|नल में पानी नहीं|पानी की कमी|ನೀರು ಬರುತ್ತಿಲ್ಲ|ನೀರಿನ ಸರಬರಾಜು ಇಲ್ಲ|ಕುಡಿಯುವ ನೀರು ಇಲ್ಲ|ನೀರು ಬರ್ತಿಲ್ಲ|தண்ணீர் வரவில்லை|தண்ணி வரல|குடிநீர் இல்லை|నీరు రావడం లేదు|నీళ్లు రావడం లేదు|నీటి సరఫరా లేదు|\b(?:pani nahi aa raha|paani nahi aa raha|thanni varala|thanni varavilla|neellu raavatledu|neeru baruttilla)\b/i, 5.7],
    ['Water quality', /गंदा पानी|पीने के पानी में बदबू|पानी गंदा आ रहा|पानी पीने लायक नहीं|दूषित पानी|\b(?:peene ka paani|drinking water|paani)\b.{0,24}\b(?:ganda|gandi|dirty|badbu|smell)\b|कुड़ने पानी|ಕಲುಷಿತ ನೀರು|ಕೊಳಕು ನೀರು|ನೀರಿನಲ್ಲಿ ದುರ್ವಾಸನೆ|ಕುಡಿಯುವ ನೀರು.{0,24}(?:ಕೊಳಕು|ದುರ್ವಾಸನೆ|ಕೆಟ್ಟ ವಾಸನೆ)|ಕುಡಿಯುವ ನೀರು ಕೊಳಕಾಗಿ ಬರುತ್ತಿದೆ|அழுக்கு குடிநீர்|தண்ணீர் அசுத்தம்|தண்ணீரில் துர்நாற்றம்|కలుషిత నీరు|మురికి నీరు|నీటికి దుర్వాసన|నీళ్లు మురికిగా వస్తున్నాయి|తాగునీరు.{0,24}(?:మురికిగా|దుర్వాసన)|మురికిగా వస్తోంది/i, 5.8],
    ['Stormwater flooding', /बारिश.{0,35}(?:पानी|जल).{0,30}(?:जमा|भर|रुक|खड़ा)|(?:सड़क|रास्ते|गली).{0,25}(?:पानी|जल).{0,25}(?:जमा|भर|खड़ा)|जलभराव|बारिश का पानी जमा|ಮಳೆ.{0,55}ನೀರು.{0,32}(?:ನಿಲ್ಲ|ತುಂಬಿ|ನಿಂತ)|ರಸ್ತೆ.{0,24}ಮಳೆ ನೀರು.{0,24}(?:ನಿಲ್ಲ|ಜಮಾ)|ಜಲಾವೃತ|மழை.{0,50}(?:தண்ணீர்|தண்ணி|நீர்).{0,30}(?:தேங்க|நிக்க|நிற்க)|சாலையில் மழைநீர் தேக்கம்|వర్షం.{0,30}నీరు.{0,25}(?:నిల|జమ)|రోడ్డుపై నీరు నిల|\b(?:when it rains|after rain|rainwater collecting|water collects during rain|water pools on the road|waterlogging|street flooding)\b|\b(?:mazhai|baarish|baarishon|varsham)\b.{0,55}\b(?:thanni|thanneer|paani|pani|neellu|neeru)\b.{0,35}\b(?:theeng|nikk|nil|jama|pool|collect)/i, 5.8],
    ['Drainage', /नाली जाम|नाली बंद|नाला जाम|नाली ओवरफ्लो|नाली का पानी सड़क पर|गटर बंद|\b(?:naali|nala|gutter)\b.{0,28}\b(?:jam|band|block|blocked|overflow|bhara)\b|ಚರಂಡಿ.{0,32}(?:ಮುಚ್ಚ|ಕಟ್ಟಿಕೊಂಡ|ತುಂಬಿ|ಹೊರಗೆ ಹರ|ಓವರ್.?ಫ್ಲೋ)|ಕೊಳಚೆ ನೀರು|ಕಾಲುವೆ ಮುಚ್ಚಿದೆ|வடிகால் அடைப்பு|சாக்கடை அடைப்பு|சாக்கடை அடைஞ்சு|కాలువ మూసుకుపోయింది|డ్రెయిన్ బ్లాక్|మురుగు కాలువ పొంగి|\b(?:blocked drain|drain is clogged|drainage blocked|sewer blocked)\b/i, 6.9],
    ['Streetlight', /गली की बत्ती|सड़क की लाइट|स्ट्रीट लाइट.{0,20}(?:बंद|खराब|नहीं जल|नहीं चल)|बत्ती.{0,25}(?:नहीं जल|बंद है|खराब)|ಬೀದಿ ದೀಪ.{0,25}(?:ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ|ಬೆಳಗುತ್ತಿಲ್ಲ|ಆರಿದೆ)|ರಸ್ತೆ ಲೈಟ್.{0,25}(?:ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ|ಆರಿದೆ)|தெரு விளக்கு.{0,20}(?:எரியவில்லை|வேலை செய்யவில்லை)|வீதி விளக்கு எரியவில்லை|వీధి లైట్.{0,20}(?:పని చేయడం లేదు|వెలగడం లేదు)|వీధి దీపం పని చేయడం లేదు/i, 5.8],
    ['Garbage', /कचरा जमा|कूड़ा जमा|कूड़ा नहीं उठाया|कचरा नहीं उठाया|कूड़ा सड़क पर पड़ा|कचरा.{0,32}(?:नहीं उठाया|नहीं हटाया|जमा|पड़ा)|कूड़ा.{0,32}(?:नहीं उठाया|नहीं हटाया|जमा|पड़ा)|\b(?:kachra|kachare|kuuda)\b.{0,30}\b(?:nahi|nahin|not)\b.{0,20}\b(?:uthaya|hataya|collected|removed)\b|ಕಸ.{0,36}(?:ತೆಗೆದುಕೊಂಡು ಹೋಗಿಲ್ಲ|ತೆಗೆದು ಹಾಕಿಲ್ಲ|ತೆರವು ಮಾಡಿಲ್ಲ|ಸಂಗ್ರಹಿಸುತ್ತಿಲ್ಲ|ತೆಗೆಯುತ್ತಿಲ್ಲ)|ರಸ್ತೆಯಲ್ಲಿ ಕಸ ತುಂಬಿದೆ|குப்பை எடுக்கவில்லை|குப்பை அகற்றவில்லை|தெருவில் குப்பை|చెత్త తీసుకెళ్లడం లేదు|చెత్త పేరుకుపోయింది|రోడ్డుపై చెత్త/i, 5.8]
  ];
  for (const [category, re, score] of multilingualCoverage) {
    const match = findPositiveMatch(re, category);
    if (match) addEvidence(category, match[0], score, 'multilingual coverage phrase');
  }

  const explicitBlockedDrain = /नाली.{0,25}(?:जाम|बंद|ओवर.?फ्लो)|नाला.{0,25}(?:जाम|बंद)|\b(?:naali|nala)\b.{0,25}\b(?:jam|band|block)\b|ಚರಂಡಿ.{0,32}(?:ಮುಚ್ಚ|ಕಟ್ಟಿಕೊಂಡ|ತುಂಬಿ)|ಸಾಕಷ್ಟು ಕೊಳಚೆ ನೀರು|சாக்கடை.{0,20}(?:அடை|மூட)|வடிகால்.{0,20}(?:அடை|மூட)|కాలువ.{0,25}(?:మూసుకుపో|బ్లాక్)|డ్రెయిన్.{0,20}బ్లాక్|\b(?:drain|sewer)\b.{0,24}\b(?:blocked|clogged|overflowing)\b/i.test(s);
  if (explicitBlockedDrain) addEvidence('Drainage', 'explicit blocked-drain phrase', 7.4, 'specific drainage phrase');

  // Context weighs the *specific civic problem*, which helps distinguish similar words.
  const contextBoosts = [
    ['Water quality', /\b(?:dirty|contaminated|muddy|yellow|brown|bad[- ]smelling)\s+(?:drinking\s+)?water\b|\bwater\s+(?:smells? bad|has a foul smell|tastes? bad|is contaminated)\b|குடிநீர் அழுக்கு|தண்ணீரில் துர்நாற்றம்|மஞ்சள் நிற தண்ணீர்|கலங்கலான தண்ணீர்|கலுஷித நீர்|కలుషిత నీరు|మురికి నీరు|నీటికి దుర్వాసన/i, 1.9],
    ['Open manhole', /\b(?:open|uncovered|missing|broken)\s+(?:manhole|drain cover|manhole cover)\b|\bmanhole\s+cover\s+(?:is\s+)?(?:missing|broken)\b|மேன்ஹோல் மூடி இல்லை|சாக்கடை மூடி இல்லை|மூடி இல்லாத வடிகால்|మ్యాన్‌హోల్ మూత లేదు|డ్రెయిన్ మూత లేదు/i, 2.35],
    ['Illegal dumping', /\b(?:illegal|unauthori[sz]ed)\s+dumping\b|\b(?:dumped\s+illegally|garbage dumped illegally)\b|சட்டவிரோதமாக குப்பை கொட்ட|அனுமதியின்றி குப்பை கொட்ட|அక్రమంగా చెత్త వేయ|అనుమతి లేకుండా చెత్త/i, 2.2],
    ['Illegal parking', /\b(?:illegal parking|wrong parking|parked illegally|vehicles? parked on (?:the )?footpath|vehicle blocking (?:the )?(?:road|driveway|entrance))\b|நடைபாதையில் வண்டி நிறுத்தி|தவறான பார்க்கிங்|ఫుట్‌పాత్‌పై వాహనాలు పార్క్|తప్పు పార్కింగ్/i, 2.1],
    ['Air pollution', /\b(?:air pollution|smoke pollution|burning (?:garbage|waste)|factory smoke|dust pollution)\b|காற்று மாசு|குப்பை எரிக்கிறார்கள்|வாகன புகை|వాయు కాలుష్యం|చెత్త కాలుస్తున్నారు/i, 1.9],
    ['Road signage', /\b(?:road sign|street name (?:board|sign)|traffic sign|signboard)\b|சாலை பெயர் பலகை|தெரு பெயர் பலகை|రోడ్ సైన్|వీధి పేరు బోర్డు/i, 1.5],
    ['Drainage', /\b(?:blocked|clogged|overflowing)\s+(?:drain|sewer|gutter)\b|\b(?:drain|sewer|gutter)\s+(?:is\s+)?(?:blocked|clogged|overflowing)\b|blocked drain|சாக்கடை அடைப்பு|డ్రైన్ బ్లాక్/i, 1.45],
    ['Water leakage', /\b(?:pipe\s+(?:leak|burst)|tap\s+(?:leak|drip)|water\s+is\s+leaking|leaking\s+pipe)\b|குழாய் கசிவு|పైపు లీక్/i, 1.5],
    ['Water supply', /\b(?:no water|water supply|low water pressure|water not coming)\b|குடிநீர் வரவில்லை|నీటి సరఫరా/i, 1.35],
    ['Stormwater flooding', /\b(?:rain(?:water)?|waterlogging|flood(?:ing)?|standing water|water collecting on the road|water\s+(?:is\s+)?standing|water\s+on\s+the\s+road)\b|மழைநீர்|வெள்ளம்|వర్షపు నీరు|వరద/i, 1.55],
    ['Streetlight', /\b(?:street\s*light|streetlight|street lamp|lamp post|road light)\b|தெருவிளக்கு|వీధి దీపం/i, 1.3],
    ['Garbage', /\b(?:garbage collection|waste collection|trash|rubbish|kuppai|chetta)\b|குப்பை|చెత్త/i, 0.55],
    ['Pothole', /\b(?:pothole|road hole|guntalu|kuzhi)\b|சாலை பள்ளம்|గుంత/i, 1.45],
    ['Road damage', /\b(?:road surface|cracked road|broken road|road repair)\b|சாலை சேதம்|రోడ్డు పాడైంది/i, 1.35],
    ['Road obstruction', /\b(?:road blocked|blocked road|obstruction on (?:the )?road|object blocking (?:the )?road|road is impassable)\b|சாலையில் தடங்கல்|ரோட்டில் தடை|రోడ్డుపై అడ్డంకి|రోడ్డు బ్లాక్ అయింది/i, 1.7],
    ['Public transport facility', /\b(?:bus stop|bus shelter|bus stand)\b|பேருந்து நிறுத்தம்|பஸ் ஸ்டாப்|బస్ స్టాప్|బస్ షెల్టర్/i, 1.1],
    ['Public infrastructure', /\b(?:public bench|broken railing|damaged railing|public staircase|public facility)\b|பொது பெஞ்ச்|இரும்பு தடுப்பு|పబ్లిక్ బెంచ్|రైలింగ్/i, 1.0],
    ['Power outage', /\b(?:power cut|power outage|no electricity|no power|current cut)\b|மின்தடை|విద్యుత్ అంతరాయం/i, 1.35]
  ];
  for (const [category, re, boost] of contextBoosts) {
    const match = findPositiveMatch(re, category);
    if (match && scores.has(category)) {
      scores.set(category, scores.get(category) + boost);
      const prev = evidence.get(category);
      evidence.set(category, { ...prev, context: match[0] });
    }
  }

  const ranked = [...scores.entries()]
    .map(([category, score]) => ({ category, score: Math.round(score * 100) / 100, evidence: evidence.get(category)?.text || '', reason: evidence.get(category)?.source || '' }))
    .sort((a, b) => b.score - a.score);

  // When a citizen clearly describes rain-driven road waterlogging and a blocked drain,
  // treat flooding as the main report and preserve drainage as a related contributing issue.
  const explicitRainRoadFlood = /(?:மழை.{0,80}(?:ரோடு|ரோட்டில்|சாலை|சாலையில்|தெரு|தெருவில்).{0,60}(?:தண்ணி|தண்ணீர்|நீர்).{0,24}(?:நிக்குது|நிற்குது|தேங்குது|தேங்கிக்கிடக்குது|தேங்குகிறது|நிக்கிறது)|ரோடு.{0,28}(?:ஃபுல்லாக|புல்லாக|முழுக்க|முழுவதும்).{0,24}(?:தண்ணி|தண்ணீர்|நீர்).{0,24}(?:நிக்குது|நிற்குது|தேங்குது|நிக்கிறது)|(?:after rain|when it rains|rainwater).{0,70}(?:road|street).{0,50}(?:water|flood|standing)|(?:water|flooding).{0,50}(?:road|street).{0,50}(?:rain|rainwater))/i.test(s);
  const explicitDrainBlock = /(?:ட்ரெயினும்?|டிரெயினும்?|ட்ரெய்னும்?|டிரைனும்?).{0,24}(?:அடச்சு|அடச்சி|அடைச்சு|அடைச்சி|அடஞ்சு|அடைஞ்சு|அடைஞ்சிரு|அடைந்து|அடைத்த|பிளாக்|ப்ளாக்|மூடிக்கிடக்க)|(?:drain|sewer|gutter).{0,28}(?:blocked|clogged|block)|(?:blocked|clogged).{0,20}(?:drain|sewer|gutter)/i.test(s);
  const linkedFloodDrain = scores.has('Stormwater flooding') && scores.has('Drainage') && explicitRainRoadFlood && explicitDrainBlock;
  const explicitPothole = /गड्ढा|गड्ढे|ಗುಂಡಿ|ಗುಂಡಿಗಳು|பள்ளம்|குழி|గుంత|\b(?:pothole|gaddha|gaddhe|pallam|kuzhi|gunta|guntalu)\b/i.test(s);
  const explicitRainPooling = /बारिश|बरसात|मಳೆ|மழை|వర్షం|rain(?:water)?|जलभराव|தண்ணீர்|ನೀರು|నీరు|पानी/i.test(s)
    && /जमा|भर जाता|रुक जाता|खड़ा|தேங்க|நிற்க|நிக்க|நిల|ನಿಲ್ಲು|ನಿಂತು|collect|pool|standing|waterlog/i.test(s);
  if (explicitPothole && (explicitRainPooling || scores.has('Stormwater flooding'))) {
    // If the citizen's main complaint is a pothole that fills with rainwater,
    // retain waterlogging as a related detail instead of misclassifying the report.
    const candidates = [];
    const pothole = ranked.find(item => item.category === 'Pothole');
    const flood = ranked.find(item => item.category === 'Stormwater flooding');
    candidates.push({ category: 'Pothole', score: Math.max(pothole?.score || 0, 6.2), evidence: pothole?.evidence || 'pothole / road-hole phrase' });
    if (flood) candidates.push({ category: 'Stormwater flooding', score: flood.score, evidence: flood.evidence });
    for (const item of ranked) {
      if (!candidates.some(candidate => candidate.category === item.category)) candidates.push(item);
    }
    return {
      category: 'Pothole', predictedCategory: 'Pothole', confidence: 'high', needsReview: false,
      relatedCategories: ['Stormwater flooding'], candidates: candidates.slice(0, 3),
      rationale: 'A road pothole is explicitly reported and rainwater pooling is retained as a related detail.'
    };
  }
    // Ask for clarification when flooding and a blocked drain
  // are both identified, but the primary issue is unclear.
  if (
    !explicitRainRoadFlood &&
    explicitDrainBlock &&
    scores.has('Stormwater flooding') &&
    scores.has('Drainage')
  ) {
    const candidates = [];

    for (const required of ['Stormwater flooding', 'Drainage']) {
      const found = ranked.find(item => item.category === required);

      if (found) {
        candidates.push({
          category: found.category,
          score: found.score,
          evidence: found.evidence
        });
      }
    }

    for (const item of ranked) {
      if (!candidates.some(candidate => candidate.category === item.category)) {
        candidates.push({
          category: item.category,
          score: item.score,
          evidence: item.evidence
        });
      }
    }

    return {
      category: '',
      predictedCategory: 'Stormwater flooding',
      confidence: 'low',
      needsReview: true,
      relatedCategories: [],
      candidates: candidates.slice(0, 3),
      rationale: 'Both flooding and a blocked drain are reported, but the primary issue is unclear; ask the citizen to clarify.'
    };
  }
  if (linkedFloodDrain) {
    // Put the declared primary issue first, followed by the related contributing issue.
    const candidates = [];
    for (const required of ['Stormwater flooding', 'Drainage']) {
      const found = ranked.find(item => item.category === required);
      if (found) candidates.push({ category: found.category, score: found.score, evidence: found.evidence });
    }
    for (const item of ranked) {
      if (!candidates.some(candidate => candidate.category === item.category)) {
        candidates.push({ category: item.category, score: item.score, evidence: item.evidence });
      }
    }
    return {
      category: 'Stormwater flooding',
      predictedCategory: 'Stormwater flooding',
      confidence: 'medium',
      needsReview: false,
      relatedCategories: ['Drainage'],
      candidates: candidates.slice(0, 3),
      rationale: 'Clear rain-related road waterlogging with a linked blocked-drain signal; flooding is the primary report and drainage is retained as a related detail.'
    };
  }
  if (!ranked.length) {
    return { category: '', predictedCategory: '', confidence: 'none', needsReview: false, relatedCategories: [], candidates: [], rationale: 'No known civic-issue phrase matched.' };
  }

  const best = ranked[0];
  const second = ranked[1];
  const margin = second ? best.score - second.score : Infinity;
  const needsReview = best.score < 2.55 || (Boolean(second) && margin < 0.7);
  const confidence = needsReview ? 'low' : best.score >= 4.0 && margin >= 0.9 ? 'high' : 'medium';
  return {
    category: needsReview ? '' : best.category,
    predictedCategory: best.category,
    confidence,
    needsReview,
    relatedCategories: [],
    candidates: ranked.slice(0, 3).map(item => ({ category: item.category, score: item.score, evidence: item.evidence })),
    rationale: needsReview
      ? 'Two or more issue categories have similar evidence, or the phrase match is weak; ask the citizen to clarify before assigning a category.'
      : `Matched ${best.reason}: “${best.evidence}”.`
  };
}
