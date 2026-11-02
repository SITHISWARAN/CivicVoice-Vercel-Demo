// Natural, localized responses used by CivicVoice complaint conversation.
export function conversationalIssueResponse(language, classification, nextStage, draft = {}) {
  const lang = String(language || 'ta-IN');
  const tamil = lang.startsWith('ta');
  const telugu = lang.startsWith('te');
  const hindi = lang.startsWith('hi');
  const kannada = lang.startsWith('kn');
  const tanglish = lang === 'ta-Latn';
  const telugish = lang === 'te-Latn';
  const hinglish = lang === 'hi-Latn';
  const linkedDrain = classification.category === 'Stormwater flooding'
    && (classification.relatedCategories || []).includes('Drainage');
  const linkedPotholeFlood = classification.category === 'Pothole'
    && (classification.relatedCategories || []).includes('Stormwater flooding');

  if (linkedPotholeFlood && nextStage === 'location') {
    if (tanglish) return 'Seri, unga road-la periya pallam irukku; mazhai varumbodhu anga thanni theengudhu-nu purinjukitten. Main complaint-a road pothole-nu record panni, rainwater collect aagura detail-um add panren. Endha street illa area-la idhu irukku?';
    if (telugish) return 'Artham ayyindi. Mee road meeda pedda gunta undi, varsham padinappudu akkada neellu nilustunnayi. Main issue-ni road pothole-ga record chesi, rainwater nilustunna detail kooda add chestanu. Ee problem ye street leda area-lo undi?';
    if (hinglish) return 'Samajh gaya. Aapki sadak par bada gaddha hai aur baarish mein usmein paani jama hota hai. Main complaint ko sadak ke gaddhe ke roop mein record karke paani jama hone ki detail bhi jodunga. Ye kis street ya area mein hai?';
    if (tamil) return 'புரிந்தது! உங்கள் சாலையில் பெரிய பள்ளம் உள்ளது; மழை பெய்யும்போது அதில் தண்ணீர் தேங்குகிறது. முக்கியப் புகாரைச் சாலைப் பள்ளம் என்று பதிவு செய்து, மழைநீர் தேங்கும் விவரத்தையும் சேர்க்கிறேன். எந்தத் தெரு அல்லது பகுதியில் இது இருக்கிறது?';
    if (telugu) return 'అర్థమైంది! మీ రోడ్డుపై పెద్ద గుంత ఉంది; వర్షం పడినప్పుడు అందులో నీరు నిలుస్తోంది. ప్రధాన ఫిర్యాదును రోడ్డు గుంతగా నమోదు చేసి, నీరు నిలిచే విషయాన్నీ వివరణలో చేర్చుతాను. ఇది ఏ వీధి లేదా ప్రాంతంలో ఉంది?';
    if (hindi) return 'समझ गया। आपकी सड़क पर बड़ा गड्ढा है और बारिश में उसमें पानी जमा हो जाता है। मुख्य शिकायत को सड़क के गड्ढे के रूप में दर्ज करके पानी जमा होने की जानकारी भी जोड़ूँगा। यह किस सड़क या इलाके में है?';
    if (kannada) return 'ಅರ್ಥವಾಯಿತು. ನಿಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಇದೆ ಮತ್ತು ಮಳೆಯಾದಾಗ ಅದರಲ್ಲಿ ನೀರು ನಿಲ್ಲುತ್ತದೆ. ಮುಖ್ಯ ದೂರನ್ನು ರಸ್ತೆ ಗುಂಡಿ ಎಂದು ದಾಖಲಿಸಿ, ನೀರು ನಿಲ್ಲುವ ವಿವರವನ್ನು ಕೂಡ ಸೇರಿಸುತ್ತೇನೆ. ಇದು ಯಾವ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿದೆ?';
    return 'Got it. There is a large pothole on the road, and rainwater collects in it. I’ll record the main issue as a pothole and keep the water-collection detail in the report. Which street or area is affected?';
  }

  if (linkedDrain && nextStage === 'location') {
    if (tanglish) return 'Seri, mazhai vandha road-la thanni nikkudhu, drain-um block aagiyirukku-nu purinjukitten. Main issue-a waterlogging-nu record panni, drain block detail-um add panren. Endha street or area-la idhu nadakkudhu?';
    if (telugish) return 'Artham ayyindi. Varsham padinappudu road meeda water nilustondi, drain kooda block ayyindi. Main issue-ni waterlogging-ga record chesi, drain block detail kooda add chestanu. Ee problem ye street leda area-lo undi?';
    if (hinglish) return 'Samajh gaya. Baarish ke baad road par paani jama hota hai aur drain bhi block hai. Main issue ko waterlogging ke roop mein record karke drain ki detail bhi add karunga. Ye kis street ya area mein hai?';
    if (tamil) return 'சரி, புரிந்தது! மழை வந்ததும் ரோட்டில் தண்ணீர் தேங்குகிறது; வடிகாலும் அடைஞ்சிருக்கு. இதை மழைநீர் தேக்கப் புகாராகக் குறித்து, வடிகால் அடைப்பையும் விவரத்தில் சேர்க்கிறேன். எந்தத் தெரு அல்லது பகுதியில் இது நடக்குது?';
    if (telugu) return 'అర్థమైంది! వర్షం పడగానే రోడ్డుపై నీరు నిలుస్తోంది, డ్రెయిన్ కూడా మూసుకుపోతోంది. దీన్ని వర్షపు నీరు నిలిచే సమస్యగా గుర్తించి, డ్రెయిన్ బ్లాక్ అయిన విషయాన్ని కూడా వివరణలో చేర్చుతాను. ఇది ఏ వీధి లేదా ప్రాంతంలో జరుగుతోంది?';
    if (hindi) return 'समझ गया। बारिश के बाद सड़क पर पानी जमा होता है और नाली भी बंद है। मुख्य समस्या को जलभराव के रूप में दर्ज करके नाली बंद होने की जानकारी भी जोड़ूँगा। यह किस सड़क या इलाके में है?';
    if (kannada) return 'ಅರ್ಥವಾಯಿತು. ಮಳೆಯಾದಾಗ ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಲ್ಲುತ್ತದೆ ಮತ್ತು ಚರಂಡಿಯೂ ಮುಚ್ಚಿದೆ. ಮುಖ್ಯ ಸಮಸ್ಯೆಯನ್ನು ನೀರು ನಿಲ್ಲುವ ಸಮಸ್ಯೆಯಾಗಿ ದಾಖಲಿಸಿ, ಚರಂಡಿ ಮುಚ್ಚಿರುವ ಮಾಹಿತಿಯನ್ನೂ ಸೇರಿಸುತ್ತೇನೆ. ಇದು ಯಾವ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿದೆ?';
    return 'Got it. Rainwater is pooling on the road and the drain is also blocked. I’ll record the main issue as stormwater flooding and keep the blocked-drain detail in the report. Which street or area is affected?';
  }

  if (nextStage === 'location' && classification.category === 'Drainage') {
    if (tanglish) return 'Seri, drainage problem-nu purinjukitten. Neenga sonna details-a complaint-la add panren. Ippo unga street name, area, illa pakkathula irukkura shop, school, bus stop maadhiri landmark sollunga. Location-a map-la kaatti confirm panna solren.';
    if (telugish) return 'Sare, drainage problem ani ardham ayyindi. Meeru cheppina vivaralanu complaint-lo add chestanu. Ippudu mee street peru, area, leka daggaralo unna shop, school, bus stop laanti landmark cheppandi. Location-ni map-lo chupinchi confirm cheyamantanu.';
    if (hinglish) return 'Theek hai, drainage ki problem samajh gaya. Aapki batayi details complaint mein add karunga. Ab street ka naam, area, ya paas ki dukaan, school, bus stop jaisa landmark bataiye. Main map par location dikha kar confirm karwaunga.';
    if (tamil) return 'சரி, வடிகால் பிரச்சினை என்று புரிந்துகொண்டேன். நீங்கள் சொன்ன விவரங்களைப் புகாரில் சேர்க்கிறேன். இப்போது உங்கள் தெருப் பெயர், பகுதி அல்லது அருகிலுள்ள கடை, பள்ளி, பேருந்து நிறுத்தம் போன்ற அடையாளத்தைச் சொல்லுங்கள். இடத்தை வரைபடத்தில் காட்டி உறுதிப்படுத்தச் சொல்கிறேன்.';
    if (telugu) return 'సరే, డ్రైనేజ్ సమస్యగా నమోదు చేస్తున్నాను. మీరు చెప్పిన వివరాలను ఫిర్యాదులో ఉంచుతాను. ఇప్పుడు మీ వీధి పేరు, ప్రాంతం లేదా దగ్గరలోని దుకాణం, పాఠశాల, బస్ స్టాప్ వంటి గుర్తు చెప్పండి. ఆ ప్రదేశాన్ని మ్యాప్‌లో చూపించి సరైనదో నిర్ధారించమంటాను.';
    if (hindi) return 'ठीक है, नाली की समस्या समझ गया। आपकी बताई जानकारी शिकायत में जोड़ूँगा। अब सड़क या इलाके का नाम, या पास की दुकान, स्कूल या बस स्टॉप जैसा कोई लैंडमार्क बताइए। फिर मैं मैप पर जगह दिखाकर पुष्टि करवाऊँगा।';
    if (kannada) return 'ಸರಿ, ಚರಂಡಿ ಸಮಸ್ಯೆ ಎಂದು ಅರ್ಥವಾಯಿತು. ನೀವು ಹೇಳಿದ ವಿವರಗಳನ್ನು ದೂರಿನಲ್ಲಿ ಸೇರಿಸುತ್ತೇನೆ. ಈಗ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದ ಹೆಸರು, ಇಲ್ಲವೇ ಹತ್ತಿರದ ಅಂಗಡಿ, ಶಾಲೆ ಅಥವಾ ಬಸ್ ನಿಲ್ದಾಣದಂತಹ ಗುರುತನ್ನು ಹೇಳಿ. ನಂತರ ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ತೋರಿಸಿ ದೃಢೀಕರಿಸಲು ಕೇಳುತ್ತೇನೆ.';
    return 'Got it — this is a drainage problem. I’ll keep the details you shared in the complaint. Now tell me the street or area, plus a nearby shop, school, or bus stop if possible. I’ll show the location on the map for confirmation.';
  }

  if (nextStage === 'location' && classification.category === 'Streetlight' && tamil && !lang.endsWith('Latn')) {
    const duration = String(draft.durationText || '').match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/i);
    let tamilDuration = '';
    if (duration) {
      const count = Number(duration[1]);
      const unit = duration[2].toLowerCase();
      if (unit.startsWith('day')) tamilDuration = count === 1 ? '1 நாளாக' : `${count} நாட்களாக`;
      else if (unit.startsWith('week')) tamilDuration = count === 1 ? '1 வாரமாக' : `${count} வாரங்களாக`;
      else if (unit.startsWith('month')) tamilDuration = count === 1 ? '1 மாதமாக' : `${count} மாதங்களாக`;
      else tamilDuration = count === 1 ? '1 வருடமாக' : `${count} வருடங்களாக`;
    }
    return `சரி, தெருவிளக்கு${tamilDuration ? ` ${tamilDuration}` : ''} எரியவில்லை என்று புரிந்துகொண்டேன். இது எந்தத் தெரு அல்லது பகுதியில் இருக்கிறது? அருகிலுள்ள கடை, பள்ளி அல்லது பேருந்து நிறுத்தம் போன்ற அடையாளத்தையும் சொல்லுங்கள்.`;
  }

  if (nextStage === 'location' && classification.category) {
    const labels = tamil ? {
      'Stormwater flooding': 'மழைநீர் ரோட்டில் தேங்கும் பிரச்சினை', 'Drainage': 'வடிகால் அடைப்பு',
      'Water supply': 'குடிநீர் வராத பிரச்சினை', 'Water quality': 'குடிநீரின் தரம் தொடர்பான பிரச்சினை', 'Water leakage': 'தண்ணீர் கசிவு', 'Open manhole': 'மூடி இல்லாத மேன்ஹோல் பிரச்சினை',
      'Streetlight': 'தெருவிளக்கு வேலை செய்யாத பிரச்சினை', 'Garbage': 'குப்பை அகற்றப்படாத பிரச்சினை',
      'Pothole': 'ரோட்டில் பள்ளம்', 'Road damage': 'சாலை சேதம்', 'Road obstruction': 'சாலையில் தடங்கல்', 'Road signage': 'சாலை பெயர் பலகை பிரச்சினை', 'Illegal parking': 'தவறான வாகன நிறுத்தம்', 'Illegal dumping': 'சட்டவிரோதமாக குப்பை கொட்டும் பிரச்சினை', 'Air pollution': 'காற்று மாசு பிரச்சினை', 'Public transport facility': 'பேருந்து நிறுத்த வசதி பிரச்சினை', 'Public infrastructure': 'பொது வசதி சேதம்', 'Power outage': 'மின்தடை'
    } : telugu ? {
      'Stormwater flooding': 'వర్షపు నీరు రోడ్డుపై నిలిచే సమస్య', 'Drainage': 'డ్రెయిన్ బ్లాక్ సమస్య',
      'Water supply': 'నీటి సరఫరా సమస్య', 'Water quality': 'తాగునీటి నాణ్యత సమస్య', 'Water leakage': 'నీటి లీక్', 'Open manhole': 'మూతలేని మ్యాన్‌హోల్ సమస్య',
      'Streetlight': 'వీధి లైట్ పని చేయని సమస్య', 'Garbage': 'చెత్త తొలగించని సమస్య',
      'Pothole': 'రోడ్డులో గుంత', 'Road damage': 'రోడ్డు దెబ్బతిన్న సమస్య', 'Road obstruction': 'రోడ్డుపై అడ్డంకి', 'Road signage': 'రోడ్ సైన్ బోర్డు సమస్య', 'Illegal parking': 'తప్పు పార్కింగ్ సమస్య', 'Illegal dumping': 'అక్రమంగా చెత్త వేసే సమస్య', 'Air pollution': 'వాయు కాలుష్య సమస్య', 'Public transport facility': 'బస్ స్టాప్ సదుపాయం సమస్య', 'Public infrastructure': 'ప్రజా సదుపాయం దెబ్బతిన్న సమస్య', 'Power outage': 'కరెంట్ సమస్య'
    } : hindi ? {
      'Stormwater flooding': 'सड़क पर बारिश का पानी जमा होना', 'Drainage': 'नाली जाम होना',
      'Water supply': 'पानी की सप्लाई की समस्या', 'Water quality': 'पीने के पानी की गुणवत्ता की समस्या', 'Water leakage': 'पानी का रिसाव', 'Open manhole': 'खुला मैनहोल',
      'Streetlight': 'स्ट्रीट लाइट खराब होना', 'Garbage': 'कूड़ा साफ न होना', 'Pothole': 'सड़क पर गड्ढा', 'Road damage': 'सड़क की खराब हालत', 'Road obstruction': 'सड़क पर रुकावट', 'Road signage': 'सड़क संकेत की समस्या', 'Illegal parking': 'अवैध पार्किंग', 'Illegal dumping': 'अवैध कचरा डंपिंग', 'Air pollution': 'वायु प्रदूषण', 'Public transport facility': 'बस स्टॉप की समस्या', 'Public infrastructure': 'सार्वजनिक सुविधा की खराबी', 'Power outage': 'बिजली की समस्या'
    } : kannada ? {
      'Stormwater flooding': 'ರಸ್ತೆಯಲ್ಲಿ ಮಳೆನೀರು ನಿಲ್ಲುವ ಸಮಸ್ಯೆ', 'Drainage': 'ಚರಂಡಿ ಮುಚ್ಚಿರುವ ಸಮಸ್ಯೆ',
      'Water supply': 'ನೀರಿನ ಸರಬರಾಜಿನ ಸಮಸ್ಯೆ', 'Water quality': 'ಕುಡಿಯುವ ನೀರಿನ ಗುಣಮಟ್ಟದ ಸಮಸ್ಯೆ', 'Water leakage': 'ನೀರಿನ ಸೋರಿಕೆ', 'Open manhole': 'ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್',
      'Streetlight': 'ರಸ್ತೆ ದೀಪ ಕೆಲಸ ಮಾಡದಿರುವುದು', 'Garbage': 'ಕಸ ತೆರವುಗೊಳಿಸದಿರುವುದು', 'Pothole': 'ರಸ್ತೆಯ ಗುಂಡಿ', 'Road damage': 'ರಸ್ತೆ ಹಾನಿ', 'Road obstruction': 'ರಸ್ತೆಯ ಅಡಚಣೆ', 'Road signage': 'ರಸ್ತೆ ಫಲಕದ ಸಮಸ್ಯೆ', 'Illegal parking': 'ಅಕ್ರಮ ಪಾರ್ಕಿಂಗ್', 'Illegal dumping': 'ಅಕ್ರಮ ಕಸ ಸುರಿಯುವುದು', 'Air pollution': 'ವಾಯು ಮಾಲಿನ್ಯ', 'Public transport facility': 'ಬಸ್ ನಿಲ್ದಾಣದ ಸಮಸ್ಯೆ', 'Public infrastructure': 'ಸಾರ್ವಜನಿಕ ಮೂಲಸೌಕರ್ಯದ ಹಾನಿ', 'Power outage': 'ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯ'
    } : {
      'Stormwater flooding': 'rainwater collecting on the road', 'Drainage': 'a blocked drain',
      'Water supply': 'a water-supply problem', 'Water quality': 'a drinking-water quality problem', 'Water leakage': 'a water leak', 'Open manhole': 'an open manhole hazard',
      'Streetlight': 'a streetlight not working', 'Garbage': 'garbage not being collected',
      'Pothole': 'a pothole', 'Road damage': 'road damage', 'Road obstruction': 'a road obstruction', 'Road signage': 'a damaged or missing road sign', 'Illegal parking': 'an illegal parking issue', 'Illegal dumping': 'illegal waste dumping', 'Air pollution': 'an air-pollution issue', 'Public transport facility': 'a bus-stop facility issue', 'Public infrastructure': 'damaged public infrastructure', 'Power outage': 'a power outage'
    };
    const label = labels[classification.category] || classification.category;
    const romanLabels = {
      'Water leakage': { tanglish: 'water pipe leak', telugish: 'water pipe leak', hinglish: 'paani ki pipe leak' },
      'Water supply': { tanglish: 'thanni supply problem', telugish: 'neella supply problem', hinglish: 'paani supply ki problem' },
      'Water quality': { tanglish: 'kudikkira thanni quality problem', telugish: 'thaguneeti quality problem', hinglish: 'peene ke paani ki quality problem' },
      'Pothole': { tanglish: 'road-la periya pallam', telugish: 'road meeda gunta', hinglish: 'sadak par gaddha' },
      'Stormwater flooding': { tanglish: 'mazhai thanni road-la theengura problem', telugish: 'varshapu neellu road meeda nilavadam', hinglish: 'baarish ka paani sadak par jama hona' },
      'Drainage': { tanglish: 'sakkadai adaippu', telugish: 'drainage block problem', hinglish: 'naali band hone ki problem' },
      'Streetlight': { tanglish: 'theru light velai seiyadha problem', telugish: 'veedhi light pani cheyani problem', hinglish: 'street light kharab hone ki problem' },
      'Garbage': { tanglish: 'kuppai allama irukkura problem', telugish: 'chetta clear cheyani problem', hinglish: 'kachra saaf na hone ki problem' }
    };
    const romanLabel = romanLabels[classification.category];
    if (tanglish) return `Seri, ${romanLabel?.tanglish || classification.category} nu purinjukitten. Correct location record panna, indha problem endha street illa area-la irukku? Pakkathula irukkura landmark-um sollunga.`;
    if (telugish) return `Sare, ${romanLabel?.telugish || classification.category} ani artham ayyindi. Correct location record cheyadaniki, ee issue ye street leda area-lo undi? Daggaralo unna landmark cheppandi.`;
    if (hinglish) return `Theek hai, ${romanLabel?.hinglish || classification.category} samajh gaya. Sahi location record karne ke liye ye kis street ya area mein hai? Paas ka landmark bhi bataiye.`;
    if (tamil) return `சரி, ${label} என்று புரிந்துகொண்டேன். சரியான இடத்தைப் பதிவு செய்ய எந்தத் தெரு அல்லது பகுதியில் இது நடக்கிறது? அருகிலுள்ள அடையாளத்தையும் சொல்லலாம்.`;
    if (telugu) return `సరే, ${label} అని అర్థమైంది. సరైన ప్రదేశాన్ని నమోదు చేయడానికి ఇది ఏ వీధి లేదా ప్రాంతంలో జరుగుతోంది? దగ్గరలోని గుర్తు కూడా చెప్పండి.`;
    if (hindi) return `ठीक है, ${label} समझ गया। सही जगह दर्ज करने के लिए यह किस सड़क या इलाके में है? पास का कोई लैंडमार्क भी बताएं।`;
    if (kannada) return `ಸರಿ, ${label} ಎಂದು ಅರ್ಥವಾಯಿತು. ಸರಿಯಾದ ಸ್ಥಳವನ್ನು ದಾಖಲಿಸಲು ಇದು ಯಾವ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿದೆ? ಹತ್ತಿರದ ಸ್ಥಳದ ಹೆಸರನ್ನೂ ಹೇಳಿ.`;
    return `Got it — ${label}. To put the report in the right place, which street or neighbourhood is affected? A nearby landmark also helps.`;
  }

  return null;
}
