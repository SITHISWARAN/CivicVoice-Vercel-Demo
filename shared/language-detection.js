const COPY = {
  'ta-IN': { gpsFailed:'இருப்பிடத்தைப் பெற முடியவில்லை. வரைபடத்தில் இடத்தைத் தேர்ந்தெடுக்கலாம்.', geocodeFound:'இடத்தை கண்டறிந்தேன்.', geocodeNotFound:'அந்த இடத்தை கண்டறிய முடியவில்லை.', locationSelected:'{place} இடம் தேர்ந்தெடுக்கப்பட்டது.', conversationFailed:'புகார் செயல்முறையில் சிக்கல் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.', speechFailed:'குரலைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' },
  'te-IN': { gpsFailed:'మీ స్థానాన్ని పొందలేకపోయాను. మ్యాప్‌లో స్థానాన్ని ఎంచుకోవచ్చు.', geocodeFound:'స్థానం కనుగొనబడింది.', geocodeNotFound:'ఆ స్థానాన్ని కనుగొనలేకపోయాను.', locationSelected:'{place} స్థానం ఎంచుకోబడింది.', conversationFailed:'ఫిర్యాదు ప్రక్రియలో సమస్య వచ్చింది. మళ్లీ ప్రయత్నించండి.', speechFailed:'మీ మాట అర్థం కాలేదు. మళ్లీ ప్రయత్నించండి.' },
  'hi-IN': { gpsFailed:'आपकी लोकेशन नहीं मिल सकी। आप मानचित्र पर स्थान चुन सकते हैं।', geocodeFound:'लोकेशन मिल गई।', geocodeNotFound:'यह लोकेशन नहीं मिली।', locationSelected:'{place} लोकेशन चुनी गई।', conversationFailed:'शिकायत प्रक्रिया में समस्या हुई। फिर से कोशिश करें।', speechFailed:'आपकी बात समझ नहीं आई। फिर से कोशिश करें।' },
  'kn-IN': { gpsFailed:'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳವನ್ನು ಆಯ್ಕೆ ಮಾಡಬಹುದು.', geocodeFound:'ಸ್ಥಳ ಕಂಡುಬಂದಿದೆ.', geocodeNotFound:'ಆ ಸ್ಥಳ ಕಂಡುಬರಲಿಲ್ಲ.', locationSelected:'{place} ಸ್ಥಳವನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.', conversationFailed:'ದೂರು ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ ಸಮಸ್ಯೆ ಉಂಟಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', speechFailed:'ನಿಮ್ಮ ಮಾತು ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.' },
  'en-IN': { gpsFailed:'I could not get your location. You can choose a point on the map.', geocodeFound:'I found the location.', geocodeNotFound:'I could not find that location.', locationSelected:'{place} was selected.', conversationFailed:'There was a problem processing the complaint. Please try again.', speechFailed:'I could not understand your speech. Please try again.' }
};
export function localizedClientMessage(language, key, vars = {}) {
  const base = String(language || 'en-IN').startsWith('ta') ? 'ta-IN' : String(language || 'en-IN').startsWith('te') ? 'te-IN' : String(language || 'en-IN').startsWith('hi') ? 'hi-IN' : String(language || 'en-IN').startsWith('kn') ? 'kn-IN' : 'en-IN';
  let text = COPY[base]?.[key] || COPY['en-IN'][key] || key;
  for (const [k,v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
