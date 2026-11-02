import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, AudioLines, Check, CheckCircle2, ChevronDown, CircleHelp,
  Clock3, Copy, FileText, Headphones, LocateFixed, MapPin, Mic, MicOff, Navigation,
  Pause, Play, Plus, Radio, RefreshCw, Search, Send, ShieldCheck, Volume2,
  Waves, X, Zap, Moon, Sun
} from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { localizedClientMessage } from '../shared/language-detection.js';

const API = '/api';
const LANGUAGES = [
  { value: 'ta-IN', label: 'Tamil', tag: 'தமிழ்', tts: 'ta-IN' },
  { value: 'ta-Latn', label: 'Tanglish', tag: 'TA + EN', tts: 'ta-IN' },
  { value: 'te-IN', label: 'Telugu', tag: 'తెలుగు', tts: 'te-IN' },
  { value: 'te-Latn', label: 'Telugish', tag: 'TE + EN', tts: 'te-IN' },
  { value: 'hi-IN', label: 'Hindi', tag: 'हिन्दी', tts: 'hi-IN' },
  { value: 'hi-Latn', label: 'Hinglish', tag: 'HI + EN', tts: 'hi-IN' },
  { value: 'kn-IN', label: 'Kannada', tag: 'ಕನ್ನಡ', tts: 'kn-IN' },
  { value: 'en-IN', label: 'English', tag: 'EN', tts: 'en-IN' },
];
const COMPLAINT_STATUSES = ['Received', 'Awaiting review', 'In progress', 'Resolved'];
const CATEGORY_OPTIONS = ['Streetlight', 'Water supply', 'Water quality', 'Water leakage', 'Drainage', 'Open manhole', 'Stormwater flooding', 'Garbage', 'Illegal dumping', 'Pothole', 'Road damage', 'Road obstruction', 'Road signage', 'Illegal parking', 'Footpath damage', 'Power outage', 'Traffic signal', 'Public toilet', 'Public transport facility', 'Mosquito nuisance', 'Stray animals', 'Fallen tree', 'Construction debris', 'Air pollution', 'Noise nuisance', 'Park maintenance', 'Public infrastructure', 'Public safety', 'Other'];
const DEFAULT_CENTER = [13.0850, 80.2101];
const PRESET_LOCATIONS = [
  { id: 'anna-nagar-second-street', label: 'Anna Nagar · 2nd Street', address: 'Anna Nagar 2nd Street, Anna Nagar, Chennai, Tamil Nadu, India', lat: 13.08518, lng: 80.21022 },
  { id: 'mogappair-main-road', label: 'Mogappair · Main Road', address: 'Mogappair Main Road, Mogappair, Chennai, Tamil Nadu, India', lat: 13.08350, lng: 80.17650 },
];
const CATEGORY_COLORS = {
  Streetlight: '#a9823f', 'Water supply': '#467a91', 'Water quality': '#568998', 'Water leakage': '#6a95a3',
  Garbage: '#57816a', 'Illegal dumping': '#637a66', Pothole: '#a96360', Drainage: '#697da0',
  'Open manhole': '#837394', 'Stormwater flooding': '#4b7c9a', 'Road damage': '#98784f',
  'Road obstruction': '#8a7056', 'Road signage': '#8f7c51', 'Illegal parking': '#a76f52',
  'Footpath damage': '#897ca0', 'Power outage': '#9a863f', 'Traffic signal': '#a36e4d',
  'Public toilet': '#4c8a80', 'Public transport facility': '#4e7e8c', 'Mosquito nuisance': '#7b8a51',
  'Stray animals': '#9a7d8a', 'Fallen tree': '#568164', 'Construction debris': '#7c7a73',
  'Air pollution': '#7b8386', 'Noise nuisance': '#667781', 'Park maintenance': '#5d8b68',
  'Public infrastructure': '#596d78', 'Public safety': '#a35f64', Other: '#849197'
};
const HELLO = {
  'hi-IN': ['नमस्ते! क्या समस्या है? बताइए।', 'नमस्ते! आप आज कौन-सी समस्या दर्ज करना चाहते हैं?', 'आपके इलाके में क्या समस्या है? बताइए।'],
  'hi-Latn': ['Namaste! Kya problem hai? Bataiye.', 'Namaste! Aaj aap kaunsi problem report karna chahte hain?', 'Aapke area mein kya problem hai? Bataiye.'],
  'kn-IN': ['ನಮಸ್ಕಾರ! ಏನು ಸಮಸ್ಯೆ? ಹೇಳಿ.', 'ನಮಸ್ಕಾರ! ಇಂದು ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?', 'ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ಏನು ಸಮಸ್ಯೆ ಇದೆ? ಹೇಳಿ.'],
  'ta-IN': ['வணக்கம்! என்ன பிரச்சினை? சொல்லுங்கள்.', 'வணக்கம்! என்ன உதவி தேவை என்று கூறுங்கள்.', 'வணக்கம்! உங்கள் பகுதியில் என்ன சிக்கல் இருக்கிறது?'],
  'ta-Latn': ['Vanakkam! Enna prachanai? Sollunga.', 'Ungalukku enna udhavi venum? Sollunga.', 'Unga area-la enna prachanai irukku?'],
  'te-IN': ['నమస్కారం! ఏం సమస్య? చెప్పండి.', 'నమస్కారం! మీకు ఏ సహాయం కావాలి?', 'నమస్కారం! మీ ప్రాంతంలో ఏమి సమస్య ఉంది?'],
  'te-Latn': ['Namaskaram! Emi samasya? Cheppandi.', 'Meeku em sahayam kavali?', 'Mee area-lo em samasya undi?'],
  'en-IN': ['Hello! What happened? Tell me in your own words.', 'Hello! What problem can I help you report today?', 'Hi there. Tell me what is happening in your neighbourhood.']
};
const CATEGORY_WORDS = {
  Streetlight: 'Streetlight / தெரு விளக்கு / వీధి లైట్', 'Water supply': 'Water supply / குடிநீர் / నీటి సరఫరా', 'Water quality': 'Water quality / குடிநீர் தரம் / తాగునీటి నాణ్యత', 'Water leakage': 'Water leakage / தண்ணீர் கசிவு / నీటి లీక్',
  Garbage: 'Garbage / குப்பை / చెత్త', 'Illegal dumping': 'Illegal dumping / குப்பை கொட்டுதல் / అక్రమ చెత్త వేయడం', Pothole: 'Pothole / சாலை பள்ளம் / రోడ్డు గుంత', Drainage: 'Drainage / வடிகால் / డ్రైనేజీ', 'Open manhole': 'Open manhole / திறந்த மேன்ஹோல் / మ్యాన్‌హోల్ మూత లేదు',
  'Stormwater flooding': 'Flooding / மழைநீர் தேக்கம் / వరద', 'Road damage': 'Road damage / சாலை சேதம்', 'Road obstruction': 'Road obstruction / சாலை தடங்கல் / రహదారి అడ్డంకి', 'Road signage': 'Road signage / சாலை பெயர் பலகை / రోడ్ సైన్', 'Illegal parking': 'Illegal parking / தவறான வாகன நிறுத்தம் / తప్పు పార్కింగ్', 'Footpath damage': 'Footpath / நடைபாதை',
  'Power outage': 'Power outage / மின்தடை / విద్యుత్ అంతరాయం', 'Traffic signal': 'Traffic signal / போக்குவரத்து சிக்னல்',
  'Public toilet': 'Public toilet / பொது கழிப்பறை', 'Public transport facility': 'Bus stop / பேருந்து நிறுத்தம் / బస్ స్టాప్', 'Mosquito nuisance': 'Mosquito nuisance / கொசு தொல்லை', 'Stray animals': 'Stray animals / தெரு விலங்குகள்',
  'Fallen tree': 'Fallen tree / விழுந்த மரம்', 'Construction debris': 'Construction debris / கட்டுமானக் கழிவு', 'Air pollution': 'Air pollution / காற்று மாசு / వాయు కాలుష్యం', 'Noise nuisance': 'Noise nuisance / சத்தத் தொல்லை',
  'Park maintenance': 'Park maintenance / பூங்கா பராமரிப்பு', 'Public infrastructure': 'Public infrastructure / பொது வசதிகள் / ప్రజా సదుపాయాలు', 'Public safety': 'Public safety / பாதுகாப்பு / భద్రత', Other: 'Other'
};

function localeFor(language) {
  const value = String(language || 'en-IN');
  if (value.startsWith('ta')) return 'ta-IN';
  if (value.startsWith('te')) return 'te-IN';
  if (value.startsWith('hi')) return 'hi-IN';
  if (value.startsWith('kn')) return 'kn-IN';
  return 'en-IN';
}
function initialDraft() {
  return { category: '', description: '', durationText: '', durationDays: null, address: '', lat: null, lng: null, locationConfirmed: false, safetyRisk: null, urgency: 'standard' };
}
function timeAgo(date) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center?.length === 2 && center.every(Number.isFinite)) map.setView(center, 14, { animate: true }); }, [center, map]);
  return null;
}
function ClickableMap({ enabled, onPick }) {
  useMapEvents({ click(event) { if (enabled) onPick(event.latlng); } });
  return null;
}

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = window.localStorage.getItem('civicvoice-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  const [language, setLanguage] = useState('ta-IN');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [stage, setStage] = useState('complaint');
  const [voiceState, setVoiceState] = useState('ready');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(initialDraft);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, recurring: 0, inProgress: 0, resolved: 0 });
  const [apiHealth, setApiHealth] = useState({ ok: false, apiKeyConfigured: false });
  const [notice, setNotice] = useState('');
  const [locationStatus, setLocationStatus] = useState({ kind: 'idle', text: 'Location not shared yet' });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapPickMode, setMapPickMode] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [statusLookup, setStatusLookup] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [activeView, setActiveView] = useState('assistant');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedComplaint, setSavedComplaint] = useState(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updatingComplaintId, setUpdatingComplaintId] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const speechRequestRef = useRef(0);
  const playbackCancelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const conversationListRef = useRef(null);
  const voiceStartInProgressRef = useRef(false);
  // The selected language controls STT, AI text responses, and spoken replies.
  // Speech recognition results never change this selection.
  const activeLanguage = language;
  const stateRef = useRef({ draft, stage, language, activeLanguage });
  stateRef.current = { draft, stage, language, activeLanguage };


  const fetchData = useCallback(async () => {
    try {
      const [healthRes, complaintsRes, statsRes] = await Promise.all([
        fetch(`${API}/health`), fetch(`${API}/complaints`), fetch(`${API}/stats`)
      ]);
      if (healthRes.ok) setApiHealth(await healthRes.json());
      if (complaintsRes.ok) setComplaints((await complaintsRes.json()).complaints || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      setApiHealth({ ok: false, apiKeyConfigured: false });
      setNotice('Backend not connected. Start the API server and refresh the page.');
    }
  }, []);

  const updateComplaintStatus = async (complaintId, status) => {
    setUpdatingComplaintId(complaintId);
    setNotice('');
    try {
      const response = await fetch(`${API}/complaints/${encodeURIComponent(complaintId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not update complaint status.');
      setComplaints(current => current.map(item => item.id === complaintId ? body.complaint : item));
      await fetchData();
      setNotice(`Demo status updated: ${complaintId} → ${status}.`);
    } catch (error) {
      setNotice(error.message || 'Could not update complaint status.');
    } finally {
      setUpdatingComplaintId(null);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleKeyDown = event => { if (event.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);
  useEffect(() => {
    try { window.localStorage.setItem('civicvoice-theme', theme); } catch { /* storage may be disabled */ }
    if (typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = theme;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#0a1220' : '#f3f6fb');
    }
  }, [theme]);
  useEffect(() => {
    // Scroll only the message viewport. scrollIntoView also moves the whole page,
    // which made the mic and composer jump out of view after every spoken turn.
    const viewport = conversationListRef.current;
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, [messages, voiceState]);
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
    window.speechSynthesis?.cancel();
  }, []);

  const pushMessage = useCallback((role, text, extra = {}) => {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, createdAt: new Date().toISOString(), ...extra };
    setMessages(prev => [...prev, item]);
    return item;
  }, []);

  const browserSpeak = useCallback((text, locale) => new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale || 'en-IN';
    utterance.rate = 1.0;
    const availableVoices = window.speechSynthesis.getVoices();
    const preferredVoice = availableVoices.find(voice => voice.lang?.toLowerCase() === String(locale || 'en-IN').toLowerCase())
      || availableVoices.find(voice => voice.lang?.toLowerCase().startsWith(String(locale || 'en-IN').slice(0, 2).toLowerCase()));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
  }), []);

  const speakText = useCallback(async (text, messageId = null, chosenLanguage = activeLanguage) => {
    if (!text) return;

    // A single speech request owns playback at a time. This also prevents an older
    // pending TTS response from starting after a newer response has begun.
    const requestId = ++speechRequestRef.current;
    const isCurrentRequest = () => requestId === speechRequestRef.current;
    const cancelPendingPlayback = playbackCancelRef.current;
    playbackCancelRef.current = null;
    if (cancelPendingPlayback) cancelPendingPlayback();

    const previousAudio = audioRef.current;
    if (previousAudio) {
      const previousUrl = previousAudio.src;
      previousAudio.onended = null;
      previousAudio.onerror = null;
      previousAudio.onabort = null;
      previousAudio.pause();
      previousAudio.removeAttribute('src');
      previousAudio.load();
      if (previousUrl.startsWith('blob:')) URL.revokeObjectURL(previousUrl);
      audioRef.current = null;
    }
    // Never allow browser speech and Gnani audio to overlap.
    window.speechSynthesis?.cancel();

    const apiLanguage = localeFor(chosenLanguage);
    setVoiceState('speaking');
    setPlayingMessageId(messageId);

    const releaseAudio = (audio) => {
      if (!audio) return;
      const url = audio.src;
      audio.onended = null;
      audio.onerror = null;
      audio.onabort = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      if (audioRef.current === audio) audioRef.current = null;
    };

    try {
      const response = await fetch(`${API}/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: apiLanguage, voiceProfile: stateRef.current.language === 'hi-Latn' ? 'hi-Latn' : apiLanguage })
      });
      if (!isCurrentRequest()) return;
      if (!response.ok) {
        let error = 'Gnani TTS is not available.';
        try { error = (await response.json()).error || error; } catch { /* use generic error */ }
        throw new Error(error);
      }

      const blob = await response.blob();
      if (!isCurrentRequest()) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';
      // Let Timbre control pacing; changing playback rate can distort pitch.
      audio.playbackRate = 1.0;
      if ('preservesPitch' in audio) audio.preservesPitch = true;
      audioRef.current = audio;

      // Route playback errors through one rejected promise. Previously both the
      // audio.onerror handler and audio.play() catch could launch browser TTS,
      // causing the same response to be spoken twice.
      await new Promise((resolve, reject) => {
        let settled = false;
        let cancelThisPlayback;
        const finish = (error = null) => {
          if (settled) return;
          settled = true;
          audio.onended = null;
          audio.onerror = null;
          audio.onabort = null;
          if (playbackCancelRef.current === cancelThisPlayback) playbackCancelRef.current = null;
          if (error) reject(error);
          else resolve();
        };
        cancelThisPlayback = () => finish(new Error('Speech playback cancelled.'));
        playbackCancelRef.current = cancelThisPlayback;
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error('Gnani audio playback failed.'));
        audio.onabort = () => finish(new Error('Speech playback was interrupted.'));
        audio.play().catch(error => finish(error || new Error('Audio playback failed.')));
      });

      if (!isCurrentRequest()) return;
      releaseAudio(audio);
      setVoiceState('ready');
      setPlayingMessageId(null);
    } catch (error) {
      if (!isCurrentRequest()) return;
      if (audioRef.current) releaseAudio(audioRef.current);
      if (playbackCancelRef.current) playbackCancelRef.current = null;
      setNotice(`${error.message || 'Gnani audio playback failed.'} Using browser voice fallback when available.`);
      // This is the only fallback call for a failed TTS request.
      await browserSpeak(text, apiLanguage);
      if (!isCurrentRequest()) return;
      setVoiceState('ready');
      setPlayingMessageId(null);
    }
  }, [activeLanguage, browserSpeak]);

  const say = useCallback(async (text, extra = {}, spokenLanguage = null) => {
    const msg = pushMessage('assistant', text, extra);
    await speakText(text, msg.id, spokenLanguage || stateRef.current.activeLanguage);
    return msg;
  }, [pushMessage, speakText]);

  const startSession = async () => {
    if (sessionStarted) return;
    setSessionStarted(true);
    setNotice('');
    const greetingLanguage = language;
    const greetingChoices = HELLO[greetingLanguage] || HELLO['en-IN'];
    const greeting = Array.isArray(greetingChoices) ? greetingChoices[0] : greetingChoices;
    await say(greeting, { kind: 'greeting' }, greetingLanguage);
  };

  const stopCurrentAudio = () => {
    speechRequestRef.current += 1;
    const cancelPendingPlayback = playbackCancelRef.current;
    playbackCancelRef.current = null;
    if (cancelPendingPlayback) cancelPendingPlayback();
    if (audioRef.current) {
      const audio = audioRef.current;
      const url = audio.src;
      audio.onended = null;
      audio.onerror = null;
      audio.onabort = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setVoiceState('ready');
    setPlayingMessageId(null);
  };

  const centerOnLocation = (lat, lng) => setMapCenter([lat, lng]);

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      const text = 'This browser does not support geolocation. Search or pin a location manually.';
      setLocationStatus({ kind: 'error', text });
      if (sessionStarted) await say(localizedClientMessage(activeLanguage, 'gpsFailed'), {}, activeLanguage);
      return;
    }
    setLocationStatus({ kind: 'loading', text: 'Requesting device location permission…' });
    navigator.geolocation.getCurrentPosition(async position => {
      const lat = position.coords.latitude, lng = position.coords.longitude;
      // GPS is only a suggested location. The citizen must inspect and confirm the
      // pin before the complaint can move to duration/summary or be saved.
      const updated = { ...stateRef.current.draft, address: 'Current device location', lat, lng, locationConfirmed: false };
      setDraft(updated);
      centerOnLocation(lat, lng);
      setLocationStatus({ kind: 'success', text: `Device location found · accuracy ±${Math.round(position.coords.accuracy)} m · confirm the map pin` });
      setMapPickMode(false);
      setStage('location_confirm');
      if (sessionStarted) {
        const pinPrompt = activeLanguage === 'en-IN'
          ? `I found your device location, accurate to about ${Math.round(position.coords.accuracy)} metres. Please check the map pin and confirm that it marks the place of the complaint.`
          : activeLanguage === 'te-Latn'
            ? 'Mee current location dorikindi. Map pin complaint jarigina chotlo undho check chesi confirm cheyyandi.'
            : activeLanguage.startsWith('te')
              ? 'మీ ప్రస్తుత స్థానాన్ని మ్యాప్‌లో గుర్తించాను. పిన్ ఫిర్యాదు జరిగిన చోటే ఉందో చూసి నిర్ధారించండి.'
              : activeLanguage === 'ta-Latn'
                ? 'Unga current location kidaichirukku. Map pin complaint nadandha idathula irukka-nu check panni confirm pannunga.'
                : activeLanguage.startsWith('ta')
                  ? 'உங்கள் தற்போதைய இருப்பிடத்தை வரைபடத்தில் குறித்துள்ளேன். பின் புகார் நடந்த இடத்தில்தான் உள்ளதா என்று பார்த்து உறுதிப்படுத்துங்கள்.'
                  : activeLanguage === 'hi-Latn'
                    ? 'Aapki current location mil gayi hai. Map pin check karke confirm karein ki yahi complaint ki jagah hai.'
                    : activeLanguage.startsWith('hi')
                      ? 'आपकी मौजूदा जगह मैप पर मिल गई है। कृपया पिन देखकर पुष्टि करें कि यही शिकायत की जगह है।'
                      : activeLanguage.startsWith('kn')
                        ? 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ಗುರುತಿಸಿದ್ದೇನೆ. ಪಿನ್ ದೂರು ನಡೆದ ಸ್ಥಳದಲ್ಲಿದೆಯೇ ಎಂದು ನೋಡಿ ದೃಢೀಕರಿಸಿ.'
                        : `Device location found (accuracy about ${Math.round(position.coords.accuracy)} metres). Please check the map pin and confirm it marks the complaint location.`;
        await say(pinPrompt, {}, activeLanguage);
      }
    }, async error => {
      const explanation = error.code === 1 ? 'Location permission denied' : error.code === 2 ? 'Location unavailable' : 'Location request timed out';
      setLocationStatus({ kind: 'error', text: `${explanation}. You can still search the address or pin it manually.` });
      setNotice(`${explanation}. Manual location is available.`);
      if (sessionStarted) await say(localizedClientMessage(activeLanguage, 'gpsFailed'), {}, activeLanguage);
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 });
  };

  const geocodeAddress = async (query) => {
    const q = /\bindia\b/i.test(query) ? query : `${query}, India`;
    // Do not silently force a citizen's address into Chennai. The map pin is shown for confirmation.
    const response = await fetch(`${API}/geocode?q=${encodeURIComponent(q)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not search this address.');
    return body.results || [];
  };

  const searchForLocation = async () => {
    if (!searchAddress.trim()) return;
    setSearchingAddress(true);
    setNotice('');
    try {
      const results = await geocodeAddress(searchAddress.trim());
      if (!results.length) throw new Error('No matching location found. Try adding the area, city or a nearby landmark.');
      const best = results[0];
      setDraft(prev => ({ ...prev, address: best.displayName, lat: best.lat, lng: best.lng, locationConfirmed: false }));
      centerOnLocation(best.lat, best.lng);
      setLocationStatus({ kind: 'success', text: 'Address found. Confirm the pin on the map before saving.' });
      setMapPickMode(false);
      setNotice('Check the map pin. Select “Confirm map pin” when the location is correct.');
      if (sessionStarted) {
        setStage('location_confirm');
        await say(localizedClientMessage(activeLanguage, 'geocodeFound'), {}, activeLanguage);
      }
    } catch (error) {
      setLocationStatus({ kind: 'error', text: error.message });
      setNotice(error.message);
    } finally { setSearchingAddress(false); }
  };

  const confirmMapPin = async () => {
    if (!Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng))) {
      setNotice('Search an address or click the map to choose a pin first.'); return;
    }
    const updated = { ...draft, locationConfirmed: true };
    setDraft(updated);
    setMapPickMode(false);
    setLocationStatus({ kind: 'success', text: 'Map pin confirmed for this complaint.' });
    const next = getNextStage(updated);
    setStage(next);
    if (next === 'confirm') setShowConfirmDialog(true);
    if (sessionStarted) await say(promptForStage(next, updated, activeLanguage), {}, activeLanguage);
  };

  const choosePresetLocation = async (place) => {
    const updated = { ...stateRef.current.draft, address: place.address, lat: place.lat, lng: place.lng, locationConfirmed: false };
    setDraft(updated);
    centerOnLocation(place.lat, place.lng);
    setMapPickMode(false);
    setStage('location_confirm');
    setLocationStatus({ kind: 'success', text: `Location selected: ${place.label}. Confirm the pin before continuing.` });
    if (sessionStarted) {
      const message = localizedClientMessage(activeLanguage, 'locationSelected', { place: place.label });
      await say(message, {}, activeLanguage);
    }
  };

  function getNextStage(value) {
    if (!value.category) return 'complaint';
    if (!value.address || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lng)) || !value.locationConfirmed) return 'location';
    if (!value.durationText) return 'duration';
    return 'confirm';
  }
  function promptForStage(next, value, lang) {
    const tanglish = lang === 'ta-Latn';
    const telugish = lang === 'te-Latn';
    const hinglish = lang === 'hi-Latn';
    if (next === 'complaint') {
      if (hinglish) return 'Aap kis problem ki report karna chahte hain? Apne words mein bataiye.';
      if (lang.startsWith('hi')) return 'आप किस समस्या की रिपोर्ट करना चाहते हैं? अपने शब्दों में बताइए।';
      if (lang.startsWith('kn')) return 'ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ.';
      if (telugish) return 'Meeru ye samasyani report cheyalanukuntunnaru? Mee maatallo cheppandi.';
      if (lang.startsWith('te')) return 'మీరు ఏ సమస్యను నివేదించాలనుకుంటున్నారు? చెప్పండి.';
      if (tanglish) return 'Enna prachanai report pannanum? Ungaloda vaarthaigal-la sollunga.';
      if (lang.startsWith('ta')) return 'என்ன பிரச்சினையைப் புகாராகச் சொல்ல விரும்புகிறீர்கள்?';
      return 'Tell me what problem you want to report.';
    }
    if (next === 'location') {
      if (hinglish) return 'Ye problem kis street ya area mein hai? Paas ka koi landmark bhi bataiye.';
      if (lang.startsWith('hi')) return 'यह समस्या किस सड़क या इलाके में है? पास का कोई लैंडमार्क भी बताएं।';
      if (lang.startsWith('kn')) return 'ಈ ಸಮಸ್ಯೆ ಯಾವ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿದೆ? ಹತ್ತಿರದ ಸ್ಥಳದ ಹೆಸರನ್ನೂ ಹೇಳಿ.';
      if (telugish) return 'Ee problem ye street leda area-lo undi? Daggaralo unna landmark cheppandi.';
      if (lang.startsWith('te')) return 'ఈ సమస్య ఏ వీధిలో లేదా ఏ ప్రాంతంలో ఉంది? దగ్గరలోని ల్యాండ్‌మార్క్ చెప్పండి.';
      if (tanglish) return 'Indha prachanai endha street illa area-la irukku? Pakkathula irukkura landmark-um sollunga.';
      if (lang.startsWith('ta')) return 'இந்தப் பிரச்சினை எந்தத் தெருவில் அல்லது எந்தப் பகுதியில் உள்ளது? அருகிலுள்ள அடையாளத்தையும் சொல்லுங்கள்.';
      return 'Which street or area is affected? Please share a nearby landmark if possible.';
    }
    if (next === 'duration') {
      if (hinglish) return 'Ye problem kitne din se hai?';
      if (lang.startsWith('hi')) return 'यह समस्या कितने दिनों से है?';
      if (lang.startsWith('kn')) return 'ಈ ಸಮಸ್ಯೆ ಎಷ್ಟು ದಿನಗಳಿಂದ ಇದೆ?';
      if (telugish) return 'Ee problem enni rojula nunchi undi?';
      if (lang.startsWith('te')) return 'ఈ సమస్య ఎన్ని రోజులుగా లేదా వారాలుగా ఉంది?';
      if (tanglish) return 'Indha prachanai ethana naala irukku?';
      if (lang.startsWith('ta')) return 'இந்தப் பிரச்சினை எத்தனை நாட்களாக அல்லது வாரங்களாக உள்ளது?';
      return 'How long has this problem existed?';
    }
    return makeSummary(value, lang);
  }

  const saveComplaint = async (value = draft) => {
    if (!value.category || !value.description || !value.durationText || !value.address || value.lat == null || value.lng == null || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lng)) || !value.locationConfirmed) {
      setNotice('Complete the complaint details and confirm the map pin before saving.'); return;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`${API}/complaints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...value, confirmed: true })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save the complaint.');
      const complaint = body.complaint;
      setSavedComplaint({ ...complaint, repeated: body.repeated, matchingCount: body.matchingCount });
      setStage('complete');
      // Keep the completed form visible alongside the generated complaint ID.
      setEditing(false);
      await fetchData();
      const completion = (() => {
        const lang = activeLanguage;
        if (lang === 'hi-Latn') return body.repeated
          ? `Aapki report ${complaint.id} demo mein save ho gayi. Paas mein ${body.matchingCount} milti-julti demo report(s) hain; review kar lein. Yeh kisi municipal office ko nahi bheji gayi.`
          : `Aapki report ${complaint.id} demo mein save ho gayi. Yeh kisi municipal office ko nahi bheji gayi.`;
        if (lang.startsWith('hi')) return body.repeated
          ? `आपकी रिपोर्ट ${complaint.id} डेमो में सेव हो गई। पास में ${body.matchingCount} इस तरह की कुछ और प्रदर्शन रिपोर्टें भी हैं; कृपया उन्हें देख लें। इसके अलावा, मैं नगर निगम के दायरे में इस समस्या का समाधान खोजने को प्राथमिकता दे रहा हूँ।`
          : `आपकी रिपोर्ट ${complaint.id} डेमो में सेव हो गई। यह किसी नगरपालिका को नहीं भेजी गई है।`;
        if (lang.startsWith('kn')) return body.repeated
          ? `ನಿಮ್ಮ ವರದಿ ${complaint.id} ಡೆಮೋದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ. ಹತ್ತಿರದಲ್ಲಿ ${body.matchingCount} ಹೋಲುವ ಡೆಮೋ ವರದಿಗಳಿವೆ. ಅವುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಈ ಸಮಸ್ಯೆಗೆ ಪರಿಹಾರ ಕಂಡುಕೊಳ್ಳುವುದಕ್ಕೂ ನಾನು ಆದ್ಯತೆ ನೀಡುತ್ತೇನೆ..`
          : `ನಿಮ್ಮ ವರದಿ ${complaint.id} ಡೆಮೋದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ. ಈ ವರದಿ ನಗರಪಾಲಿಕೆಗೆ ಕಳುಹಿಸಲಾಗಿಲ್ಲ.`;
        if (lang === 'te-Latn') return body.repeated
          ? `Mee report ${complaint.id} demo-lo save ayyindi. Daggaralo ${body.matchingCount} similar demo reports unnayi; review cheyyandi. Idi municipal office-ku pampaledu.`
          : `Mee report ${complaint.id} demo-lo save ayyindi. Idi municipal office-ku pampaledu.`;
        if (lang.startsWith('te')) return body.repeated
          ? `మీ ఫిర్యాదు ${complaint.id} డెమోలో సేవ్ అయింది. దగ్గరలో ${body.matchingCount} ఇలాంటి డెమో నివేదికలు ఉన్నాయి; వాటిని పరిశీలించండి. నేను కూడా పరిష్కరించాల్సిన సమస్యకు ప్రాధాన్యత ఇస్తాను.`
          : `మీ ఫిర్యాదు ${complaint.id} డెమోలో సేవ్ అయింది. ఇది మున్సిపాలిటీకి పంపబడలేదు.`;
        if (lang === 'ta-Latn') return body.repeated
          ? `Unga report ${complaint.id} demo-la save aagiyirukku. Pakkathula ${body.matchingCount} similar demo reports irukku; review pannunga.`
          : `Unga report ${complaint.id} demo-la save aagiyirukku. ithu munnurimai adipadaiil nadavadikai adukapadum.`;
        if (lang.startsWith('ta')) return body.repeated
          ? `உங்கள் புகார் ${complaint.id} டெமோவில் சேமிக்கப்பட்டது. அருகில் ${body.matchingCount} ஒத்த டெமோ புகார்கள் உள்ளன; அவற்றைச் சரிபார்க்கவும்.நானும் இந்தப் பிரச்சினைக்குத் தீர்வு காண்பதற்கு முன்னுரிமை அளிக்கிறேன். .`
          : `உங்கள் புகார் ${complaint.id} டெமோவில் சேமிக்கப்பட்டது.`;
        return body.repeated
          ? `Report ${complaint.id} has been saved to this demo. I found ${body.matchingCount} similar demo record(s); please review them.There are other such demonstration reports; please check them. Furthermore, I am prioritizing finding a solution to this issue within the municipal context..`
          : `Report ${complaint.id} has been saved to this demo. There are other such demonstration reports; please check them. Furthermore, I am prioritizing finding a solution to this issue within the municipal context..`;
      })();
      await say(completion, { kind: 'completion', complaintId: complaint.id });
    } catch (error) {
      setNotice(error.message);
    } finally { setBusy(false); }
  };

  const handleTranscript = async (transcript) => {
    const { draft: currentDraft, stage: currentStage } = stateRef.current;
    const currentLanguage = stateRef.current.language || 'ta-IN';
    pushMessage('user', transcript, { kind: 'transcript' });
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`${API}/conversation/turn`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, stage: currentStage === 'complete' ? 'complaint' : currentStage, language: currentLanguage, draft: currentDraft })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not process this conversation turn.');
      if (body.classification?.needsReview && currentStage === 'complaint' && !currentDraft.category) {
        const options = (body.classification.candidates || []).map(item => item.category).filter(Boolean).slice(0, 2);
        setNotice(`The issue category is uncertain${options.length ? ` (${options.join(' or ')})` : ''}. Add a detail or choose the category before saving.`);
      }
      let nextDraft = body.draft || currentDraft;
      let nextStage = body.nextStage || currentStage;
      let responseText = body.response || 'Please continue.';

      if (body.action === 'use_location') {
        setBusy(false);
        setStage('location');
        await useCurrentLocation();
        return;
      }
      if (body.action === 'select_location' && body.selectedLocation) {
        const picked = body.selectedLocation;
        nextDraft = { ...nextDraft, address: picked.displayName, lat: Number(picked.lat), lng: Number(picked.lng), locationConfirmed: false };
        nextStage = 'location_confirm';
        centerOnLocation(Number(picked.lat), Number(picked.lng));
        setLocationStatus({ kind: 'success', text: `Location matched: ${picked.shortName || picked.displayName}. Confirm the map pin.` });
        setMapPickMode(false);
        const isAnnaStreet = picked.id === 'anna-nagar-second-street';
        const spokenPlaceLabel = currentLanguage === 'ta-IN'
          ? (isAnnaStreet ? 'அண்ணா நகர் இரண்டாவது தெரு' : 'முகப்பேர் மெயின் ரோடு')
          : currentLanguage === 'te-IN'
            ? (isAnnaStreet ? 'అన్నా నగర్ రెండవ వీధి' : 'మొగப்பைర్ మెయిన్ రోడ్')
            : currentLanguage === 'hi-IN'
              ? (isAnnaStreet ? 'अन्ना नगर दूसरी सड़क' : 'मोगाप्पैर मेन रोड')
              : currentLanguage === 'kn-IN'
                ? (isAnnaStreet ? 'ಅಣ್ಣಾ ನಗರ ಎರಡನೇ ರಸ್ತೆ' : 'ಮೊಗಪ್ಪೈರ್ ಮುಖ್ಯ ರಸ್ತೆ')
                : (picked.shortName || picked.displayName);
        responseText = localizedClientMessage(currentLanguage, 'locationSelected', { place: spokenPlaceLabel });
      } else if (body.action === 'geocode_location') {
        try {
          const results = await geocodeAddress(nextDraft.address);
          if (!results.length) throw new Error('No address match');
          nextDraft = { ...nextDraft, address: results[0].displayName, lat: results[0].lat, lng: results[0].lng, locationConfirmed: false };
          nextStage = 'location_confirm';
          centerOnLocation(results[0].lat, results[0].lng);
          setLocationStatus({ kind: 'success', text: 'Possible location found. Confirm the pin on the map.' });
          responseText = localizedClientMessage(currentLanguage, 'geocodeFound');
        } catch {
          nextStage = 'location';
          responseText = localizedClientMessage(currentLanguage, 'geocodeNotFound');
          setLocationStatus({ kind: 'error', text: 'Address not found. Try a landmark or choose a pin manually.' });
        }
      }
      setDraft(nextDraft);
      setStage(nextStage);
      if (nextStage === 'confirm' && body.action !== 'confirm') setShowConfirmDialog(true);
      if (body.action === 'cancel') { setShowConfirmDialog(false);
        setDraft(initialDraft()); setStage('complaint'); setSavedComplaint(null); setEditing(false);
        setBusy(false); await say(responseText, {}, currentLanguage); return;
      }
      if (body.action === 'confirm') {
        setShowConfirmDialog(false);
        setBusy(false);
        await saveComplaint(nextDraft);
        return;
      }
      if (body.action === 'show_edit') setEditing(true);
      setBusy(false);
      await say(responseText, {}, currentLanguage);
    } catch (error) {
      setBusy(false);
      setNotice(error.message);
      await say(localizedClientMessage(currentLanguage, 'conversationFailed'), {}, currentLanguage);
    }
  };

  const transcribeAudio = async (blob) => {
    setVoiceState('processing');
    setBusy(true);
    setNotice('');
    try {
      const form = new FormData();
      form.append('audio', blob, `civicvoice-${Date.now()}.webm`);
      const selectedLanguage = stateRef.current.language || 'ta-IN';
      form.append('language', localeFor(selectedLanguage));
      const response = await fetch(`${API}/stt`, { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Speech recognition failed.');
      if (!body.transcript?.trim()) throw new Error('I could not hear clear words. Please try again.');
      setVoiceState('ready');
      setBusy(false);
      await handleTranscript(body.transcript.trim());
    } catch (error) {
      setVoiceState('ready');
      setBusy(false);
      setNotice(error.message);
      await say(localizedClientMessage(stateRef.current.language || 'ta-IN', 'speechFailed'), {}, stateRef.current.language || 'ta-IN');
    }
  };

  const startRecording = async (allowFirstSession = false) => {
    // The first tap may greet the user, then proceed into recording on the same toggle.
    if (!sessionStarted && !allowFirstSession) { await startSession(); return; }
    if (voiceState === 'speaking') { stopCurrentAudio(); }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice('This browser cannot record audio. Please use a current version of Chrome or Edge over localhost/HTTPS.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : undefined;
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingSeconds(0);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1000) {
          setIsRecording(false); setVoiceState('ready'); setNotice('Recording was too short. Hold the microphone for a moment and try again.'); return;
        }
        setIsRecording(false);
        transcribeAudio(blob);
      };
      recorder.start(250);
      setIsRecording(true);
      setVoiceState('recording');
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(value => {
        if (value >= 59) { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); return 60; }
        return value + 1;
      }), 1000);
    } catch (error) {
      setNotice(error.name === 'NotAllowedError' ? 'Microphone permission denied. Allow microphone access in your browser or use the text box as a fallback.' : `Could not start microphone: ${error.message}`);
      setVoiceState('ready');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    // Prevent rapid taps from opening multiple permission prompts / recorders.
    if (voiceStartInProgressRef.current) return;
    voiceStartInProgressRef.current = true;
    try {
      if (!sessionStarted) await startSession();
      // `sessionStarted` in this render may be stale after the greeting, so explicitly
      // allow recording to continue on the same first tap.
      await startRecording(true);
    } finally {
      voiceStartInProgressRef.current = false;
    }
  };

  const clickMapPoint = (latlng) => {
    setDraft(prev => ({ ...prev, lat: latlng.lat, lng: latlng.lng, address: `Manual map pin (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`, locationConfirmed: false }));
    setLocationStatus({ kind: 'pending', text: 'Pin selected. Confirm it before saving.' });
    setMapCenter([latlng.lat, latlng.lng]);
    setMapPickMode(false);
    setNotice('Pin selected. Review the address and choose Confirm map pin.');
    if (sessionStarted) setStage('location_confirm');
  };

  const submitTypedTurn = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const value = form.elements.namedItem('typedTurn')?.value?.trim();
    if (!value || busy) return;

    // Typing is a first-class way to start a conversation; do not require microphone access.
    form.reset();
    if (!sessionStarted) setSessionStarted(true);
    await handleTranscript(value);
  };

  const updateDraftField = (key, value) => setDraft(prev => key === 'address' && value !== prev.address ? ({ ...prev, address: value, lat: null, lng: null, locationConfirmed: false }) : ({ ...prev, [key]: value }));

  const discardDraft = async () => {
    if (!window.confirm('Discard this unconfirmed complaint draft? Nothing will be saved.')) return;
    setDraft(initialDraft()); setStage('complaint'); setSavedComplaint(null); setEditing(false); setShowConfirmDialog(false); setNotice('');
    const text = activeLanguage === 'hi-Latn' ? 'Draft cancel ho gaya. Koi report save nahi hui.'
      : activeLanguage.startsWith('hi') ? 'ड्राफ्ट रद्द कर दिया गया। कोई रिपोर्ट सेव नहीं हुई।'
      : activeLanguage.startsWith('kn') ? 'ಡ್ರಾಫ್ಟ್ ರದ್ದುಗೊಂಡಿದೆ. ಯಾವುದೇ ವರದಿ ಉಳಿಸಲಾಗಿಲ್ಲ.'
      : activeLanguage === 'te-Latn' ? 'Draft cancel ayyindi. Report save cheyyaledu.'
      : activeLanguage.startsWith('te') ? 'డ్రాఫ్ట్ రద్దు చేయబడింది. ఏ నివేదికా సేవ్ కాలేదు.'
      : activeLanguage === 'ta-Latn' ? 'Draft cancel pannitten. Endha report-um save aagala.'
      : activeLanguage.startsWith('ta') ? 'வரைவு ரத்து செய்யப்பட்டது. எந்தப் புகாரும் சேமிக்கப்படவில்லை.'
      : 'Draft discarded. No report was saved.';
    await say(text);
  };

  const startNewComplaint = async () => {
    setDraft(initialDraft()); setStage('complaint'); setSavedComplaint(null); setEditing(false); setShowConfirmDialog(false); setNotice('');
    const greetingLanguage = language;
    const greeting = activeLanguage === 'hi-Latn' ? 'Theek hai, nayi report shuru karte hain. Kya hua?'
      : activeLanguage.startsWith('hi') ? 'ठीक है, नई रिपोर्ट शुरू करते हैं। क्या हुआ?'
      : activeLanguage.startsWith('kn') ? 'ಸರಿ, ಹೊಸ ವರದಿಯನ್ನು ಪ್ರಾರಂಭಿಸೋಣ. ಏನಾಯಿತು?'
      : activeLanguage === 'te-Latn' ? 'Sare, kotta report start cheddam. Emi jarigindi?'
      : activeLanguage.startsWith('te') ? 'సరే, కొత్త ఫిర్యాదు. ఏం జరిగింది?'
      : activeLanguage === 'ta-Latn' ? 'Seri, pudhu report start pannalaam. Enna nadandhuchu?'
      : activeLanguage.startsWith('ta') ? 'சரி, புதிய புகாரைத் தொடங்கலாம். என்ன நடந்தது?'
      : 'Okay, let’s start a new report. What happened?';
    await say(greeting, { kind: 'prompt' }, greetingLanguage);
  };

  const makeSummary = (value = draft, lang = activeLanguage) => {
    const loc = value.address || 'location not selected';
    const duration = value.durationText || 'duration not specified';
    if (lang === 'hi-Latn') return `Theek hai, ${value.category || 'civic issue'} ki report ${loc} ke liye hai aur ${duration} se chal rahi hai. Kya main ise demo mein save karun?`;
    if (lang.startsWith('hi')) return `ठीक है, ${value.category || 'नागरिक समस्या'} की रिपोर्ट ${loc} के लिए है और ${duration} से चल रही है। क्या इसे डेमो में सेव करूँ?`;
    if (lang.startsWith('kn')) return `ಸರಿ, ${value.category || 'ನಾಗರಿಕ ಸಮಸ್ಯೆ'} ವರದಿ ${loc} ಕುರಿತು ಇದೆ ಮತ್ತು ${duration}ರಿಂದ ಇದೆ. ಇದನ್ನು ಡೆಮೋದಲ್ಲಿ ಉಳಿಸಬೇಕೇ?`;
    if (lang === 'te-Latn') return `Sare, ${value.category || 'civic issue'} report ${loc} kosam, ${duration} nunchi undi. Demo-lo save cheyyana?`;
    if (lang.startsWith('te')) return `సరే, ${value.category || 'సమస్య'} ఫిర్యాదు. స్థలం ${loc}. వ్యవధి ${duration}. ఈ వివరాలను డెమోలో నమోదు చేయనా?`;
    if (lang === 'ta-Latn') return `Seri, ${value.category || 'civic issue'} report ${loc}-la, ${duration}-a irukku. Demo-la save pannattuma?`;
    if (lang.startsWith('ta')) return `சரி, ${value.category || 'பிரச்சினை'} புகார். இடம் ${loc}. காலம் ${duration}. இதை டெமோவில் பதிவு செய்யலாமா?`;
    return `Please check: ${value.category || 'civic issue'} at ${loc}, ongoing for ${duration}. Shall I save this to the demo records?`;
  };

  const runStatusLookup = async (event) => {
    event.preventDefault();
    setLookupResult(null);
    if (!statusLookup.trim()) return;
    try {
      const response = await fetch(`${API}/complaints/${encodeURIComponent(statusLookup.trim())}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not find that ID.');
      setLookupResult(body.complaint);
      const item = body.complaint;
      const statusMessage = activeLanguage === 'hi-Latn' ? `Report ${item.id} ka demo status ${item.status} hai.`
        : activeLanguage.startsWith('hi') ? `रिपोर्ट ${item.id} का डेमो स्टेटस ${item.status} है।`
        : activeLanguage.startsWith('kn') ? `ವರದಿ ${item.id} ರ ಡೆಮೋ ಸ್ಥಿತಿ ${item.status}.`
        : activeLanguage === 'te-Latn' ? `Mee report ${item.id} demo status ${item.status}.`
        : activeLanguage.startsWith('te') ? `ఫిర్యాదు ${item.id} డెమో స్థితి ${item.status}.`
        : activeLanguage === 'ta-Latn' ? `Unga report ${item.id} oda demo status ${item.status}.`
        : activeLanguage.startsWith('ta') ? `புகார் ${item.id} டெமோ நிலை: ${item.status}.`
        : `Demo status for report ${item.id}: ${item.status}.`;
      await say(statusMessage);
    } catch (error) { setNotice(error.message); }
  };

  const visibleComplaints = useMemo(() => showAllReports ? complaints : complaints.slice(0, 9), [complaints, showAllReports]);
  const mapPoints = useMemo(() => complaints.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)), [complaints]);
  const mapRecurringCount = useMemo(() => mapPoints.filter(item => item.recurringFlag).length, [mapPoints]);
  const mapCategoryCount = useMemo(() => new Set(mapPoints.map(item => item.category).filter(Boolean)).size, [mapPoints]);
  const mapLegendItems = useMemo(() => {
    const counts = new Map();
    mapPoints.forEach(item => { if (item.category) counts.set(item.category, (counts.get(item.category) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([category, count]) => ({ category, count }));
  }, [mapPoints]);
  const matchingCount = useMemo(() => {
    if (!draft.category || draft.lat == null || draft.lng == null || !Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng))) return 0;
    return complaints.filter(item => item.category === draft.category && !/Resolved/i.test(item.status) && distanceMeters(Number(draft.lat), Number(draft.lng), item.lat, item.lng) <= 100).length;
  }, [complaints, draft.category, draft.lat, draft.lng]);

  return (
    <div className="app-shell" data-theme={theme} data-sidebar-open={sidebarOpen ? 'true' : 'false'}>
      <button type="button" className={`drawer-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu" tabIndex={sidebarOpen ? 0 : -1} />
      <aside id="civicvoice-sidebar" className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-hidden={!sidebarOpen}>
        <button type="button" className="sidebar-dismiss" onClick={() => setSidebarOpen(false)} aria-label="Close workspace menu"><X size={18} /></button>
        <div className="brand-lockup">
          <div className="brand-symbol"><AudioLines size={23} strokeWidth={2.4} /></div>
          <div><div className="brand-name">CivicVoice</div><div className="brand-tagline">CIVIC ISSUE REPORTING</div></div>
        </div>
        <div className="environment-pill"><span className="env-mark" /> Prototype demo</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeView === 'assistant' ? 'active' : ''}`} onClick={() => { setActiveView('assistant'); setSidebarOpen(false); }}><Mic size={18} /> New report <span className="nav-hotkey">01</span></button>
          <button className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => { setActiveView('reports'); setSidebarOpen(false); }}><FileText size={18} /> Complaint records <span className="nav-count">{stats.total}</span></button>
          <button className={`nav-item ${activeView === 'status' ? 'active' : ''}`} onClick={() => { setActiveView('status'); setSidebarOpen(false); }}><Activity size={18} /> Track status</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="api-health-card">
            <div className="api-health-title"><span className={`status-dot ${apiHealth.apiKeyConfigured ? 'ok' : 'warn'}`} /> Voice input</div>
            <div className="api-health-copy">{apiHealth.apiKeyConfigured ? 'Voice reporting is available' : 'Text reporting is available; voice needs setup'}</div>
            <button className="tiny-link" onClick={fetchData}><RefreshCw size={13} /> Check again</button>
          </div>
          <div className="user-mini"><div className="user-avatar">CV</div><div><strong>Resident reporting</strong><span>Demo environment</span></div><ShieldCheck size={17} className="shield-muted" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title-row">
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open workspace menu" aria-controls="civicvoice-sidebar" aria-expanded={sidebarOpen} title="Open workspace menu">
              <span className="hamburger-lines" aria-hidden="true"><i /><i /><i /></span><span className="menu-toggle-label">Menu</span>
            </button>
            <div><div className="eyebrow">COMMUNITY SERVICES / REPORTING DEMO</div><h1>{activeView === 'assistant' ? 'Report a civic issue' : activeView === 'reports' ? 'Complaint records' : 'Track a complaint'}</h1></div>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              aria-pressed={theme === 'dark'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Day mode' : 'Night mode'}</span>
            </button>
            <div className="system-pill">Demo mode</div>
          </div>
        </header>

        {notice && <div className="notice-banner" role="status"><AlertTriangle size={17} /><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div>}

        {showConfirmDialog && stage === 'confirm' && !savedComplaint && <div className="confirm-overlay" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="dialog-close" onClick={() => setShowConfirmDialog(false)} aria-label="Close confirmation"><X size={18} /></button><div className="dialog-icon"><CheckCircle2 size={26} /></div><div className="dialog-eyebrow">READY TO SAVE</div><h2 id="confirm-title">Review your complaint</h2><p className="dialog-subtitle">CivicVoice has organised the details you shared. Confirm to save this report.</p><div className="confirm-summary"><div><span>ISSUE</span><strong>{draft.category || 'Civic issue'}</strong></div><div><span>DURATION</span><strong>{draft.durationText || 'Not provided'}</strong></div><div className="summary-location"><span>LOCATION</span><strong>{draft.address || 'Location not selected'}</strong></div><div className="summary-description"><span>DESCRIPTION</span><strong>{draft.description || 'No description yet'}</strong></div>{matchingCount > 0 && <div className="summary-match"><MapPin size={15} /><span>{matchingCount} similar nearby report{matchingCount === 1 ? '' : 's'} found</span></div>}</div><div className="dialog-actions"><button className="dialog-secondary" onClick={() => { setShowConfirmDialog(false); setEditing(true); }}><FileText size={16} /> Edit details</button><button className="dialog-primary" disabled={busy || !draft.durationText || !draft.locationConfirmed} onClick={() => saveComplaint(draft)}>{busy ? <span className="dialog-spinner" /> : <CheckCircle2 size={17} />} {busy ? 'Saving…' : 'Confirm & save'}</button></div><div className="dialog-footnote"><ShieldCheck size={14} /> This saves to CivicVoice demo records only; it does not notify a municipality.</div></section></div>}

        {activeView === 'assistant' && (
          <>
          <div className="overview-strip" aria-label="How CivicVoice works">
            <div className="overview-item"><div className="overview-icon mint"><ShieldCheck size={17} /></div><div><strong>Tap to speak</strong><span>Mic stays off between turns</span></div></div>
            <div className="overview-separator" />
            <div className="overview-item"><div className="overview-icon blue"><MapPin size={17} /></div><div><strong>Confirm the place</strong><span>You choose the final map pin</span></div></div>
            <div className="overview-separator" />
            <div className="overview-item"><div className="overview-icon slate"><CheckCircle2 size={17} /></div><div><strong>Review, then save</strong><span>Your approval comes first</span></div></div>
          </div>
          <div className="workspace-grid">
            <section className="left-column">
              <div className={`conversation-panel panel ${voiceState}`}>
                <div className="conversation-header">
                  <div>
                    <div className="section-kicker"><span className="kicker-dot" /> CIVICVOICE · GUIDED REPORT</div>
                    <div className="conversation-language-row" role="group" aria-label="Choose the language for this conversation">
                      <div className="conversation-language-label"><Waves size={15} /><span>Choose your language</span></div>
                      <div className="conversation-language-options">
                        {LANGUAGES.map(item => <button
                          key={item.value}
                          type="button"
                          className={`conversation-language-button ${language === item.value ? 'is-selected' : ''}`}
                          onClick={() => { setLanguage(item.value); if (voiceState === 'speaking') stopCurrentAudio(); }}
                          disabled={busy || isRecording}
                          aria-pressed={language === item.value}
                          title={`Use ${item.label} for speech recognition and AI replies`}
                        >{item.label}</button>)}
                      </div>
                      <span className="conversation-language-hint">Speech recognition and CivicVoice replies will stay in the selected language.</span>
                    </div>
                    <div className="conversation-title-row">
                      <h2>Tell us what needs attention</h2>
                      <div className={`chat-state-pill ${voiceState}`}><span />{!sessionStarted ? 'Ready to start' : voiceState === 'recording' ? 'Listening' : voiceState === 'processing' ? 'Understanding' : voiceState === 'speaking' ? 'Speaking' : stage === 'complete' ? 'Recorded' : 'Ready'}</div>
                    </div>
                    <p>Describe the issue in your own words. You can speak or type, then review the details before saving.</p>
                  </div>
                </div>
                <div className="conversation-subhead"><div><h3>Conversation</h3><p>Your spoken turns and assistant replies</p></div><span className="turn-count">{messages.length} messages</span></div>
                {messages.length === 0 ? <div className="empty-conversation"><div className="empty-icon"><AudioLines size={21} /></div><strong>No messages yet</strong><span>Start by describing a problem. Speak or type a message below; you can review the recognised words before continuing.</span></div> : <div className="conversation-list" ref={conversationListRef}>
                  {messages.map(message => <div key={message.id} className={`message-row ${message.role}`}>
                    <div className={`message-avatar ${message.role}`}>{message.role === 'user' ? <Mic size={15} /> : <AudioLines size={15} />}</div>
                    <div className="message-content"><div className="message-meta"><strong>{message.role === 'user' ? 'You' : 'CivicVoice'}</strong><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{message.role === 'assistant' && <button className="replay-button" title="Replay spoken response" onClick={() => speakText(message.text, message.id)}><Volume2 size={14} /> {playingMessageId === message.id ? 'Playing' : 'Replay'}</button>}</div><div className="message-bubble">{message.text}</div></div>
                  </div>)}<div ref={messagesEndRef} /></div>}
                <form className="typed-fallback chat-composer" onSubmit={submitTypedTurn}>
                  <div className="chat-composer-tools">
                    <div className="chat-status-copy"><span className={`chat-status-dot ${voiceState}`} /><span>{isRecording ? `Recording · 00:${String(recordingSeconds).padStart(2, '0')}` : voiceState === 'processing' ? 'Understanding your message…' : voiceState === 'speaking' ? 'CivicVoice is speaking' : !sessionStarted ? 'Type below or tap the mic to start' : 'Mic stays off between turns'}</span></div>
                    <div className="chat-quick-actions">
                      <button type="button" className="soft-button" onClick={useCurrentLocation} disabled={locationStatus.kind === 'loading'} title="Use your device location"><LocateFixed size={14} /><span>My location</span></button>
                      <button type="button" className="soft-button" onClick={() => speakText(activeLanguage === 'hi-Latn' ? 'Namaste! Apni problem bataiye.' : activeLanguage.startsWith('hi') ? 'नमस्ते! अपनी समस्या बताइए।' : activeLanguage.startsWith('kn') ? 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ.' : activeLanguage === 'te-Latn' ? 'Namaskaram! Mee problem cheppandi.' : activeLanguage.startsWith('te') ? 'నమస్కారం! మీ సమస్య చెప్పండి.' : activeLanguage === 'ta-Latn' ? 'Vanakkam! Unga prachanaiya sollunga.' : activeLanguage.startsWith('ta') ? 'வணக்கம்! உங்கள் பிரச்சினையைச் சொல்லுங்கள்.' : 'Hello! Tell me what happened.', null, activeLanguage)} disabled={busy || voiceState === 'speaking'} title="Test the assistant voice"><Volume2 size={14} /><span>Test voice</span></button>
                      {voiceState === 'speaking' && <button type="button" className="soft-button" onClick={stopCurrentAudio}><Pause size={14} /><span>Stop voice</span></button>}
                    </div>
                  </div>
                  <div className="chat-voice-control">
                    <strong className="chat-voice-kicker">VOICE INPUT</strong>
                    <button type="button" className={`voice-dock-button ${isRecording ? 'recording' : ''}`} onClick={toggleVoiceRecording} disabled={(busy && !isRecording)} aria-label={isRecording ? 'Stop recording' : 'Start recording'} title={isRecording ? 'Tap to stop recording and transcribe' : 'Tap to start recording'}>
                      {voiceState === 'processing' ? <RefreshCw size={21} className="spin" /> : isRecording ? <Pause size={21} fill="currentColor" /> : sessionStarted ? <Mic size={21} /> : <Play size={19} fill="currentColor" />}
                    </button>
                    <span>{isRecording ? `Listening · 00:${String(recordingSeconds).padStart(2, '0')} — tap to finish` : voiceState === 'processing' ? 'Understanding your message…' : voiceState === 'speaking' ? 'CivicVoice is replying' : sessionStarted ? 'Tap the microphone to speak' : 'Tap to start your conversation'}</span>
                  </div>
                  <div className="typed-input-wrap chat-input-wrap">
                    <input name="typedTurn" placeholder="Type a message to start or add a detail…" aria-label="Type a conversation message" autoComplete="off" disabled={busy} />
                    <button type="submit" className="send-turn-button" disabled={busy} aria-label="Send typed message" title="Send message"><Send size={17} /></button>
                  </div>
                  <div className="chat-composer-foot"><span>Microphone is off between turns</span><span>Review before saving</span></div>
                </form>
              </div>
            </section>

            <section className="right-column">
              <div className="map-panel panel">
                <div className="panel-heading map-heading"><div><h3>Complaint map</h3><p>View sample reports and confirm the location for this report</p></div><div className="map-heading-actions"><span className="map-count-pill"><MapPin size={13} /> {mapPoints.length} mapped</span><button className={`icon-button ${mapPickMode ? 'selected' : ''}`} title="Click map to choose a location" aria-label="Choose complaint location on map" onClick={() => setMapPickMode(value => !value)}><MapPin size={17} /></button></div></div>
                <div className={`map-instruction ${mapPickMode ? 'active' : ''}`}><span className="map-instruction-dot" />{mapPickMode ? 'Pin mode active · click the map where the issue happened.' : 'Select a marker to inspect a complaint. Zoom in for street-level detail.'}</div>
                <div className="map-confirm-top-row">
                  <span>{draft.locationConfirmed ? 'Map pin confirmed' : draft.lat != null && draft.lng != null ? 'Location selected · confirm to continue' : 'Choose a location to enable confirmation'}</span>
                  <button type="button" className="confirm-pin-button" onClick={confirmMapPin} disabled={draft.lat == null || draft.lng == null || !Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng))}><Check size={14} /> Confirm map pin</button>
                </div>
                <div className="map-canvas">
                  <div className="map-overlay-meta"><span className="map-overlay-label"><i /> {mapPickMode ? 'SELECT LOCATION' : 'MAP OVERVIEW'}</span><span>{mapPoints.length} reports · {mapCategoryCount} issue types</span></div>
                  <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} zoomControl={true} attributionControl={true}>
                    <MapUpdater center={mapCenter} />
                    <ClickableMap enabled={mapPickMode} onPick={clickMapPoint} />
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {mapPoints.map(item => <CircleMarker key={item.id} center={[item.lat, item.lng]} radius={item.recurringFlag ? 9 : 6} pathOptions={{ color: '#ffffff', fillColor: item.recurringFlag ? '#fb7185' : CATEGORY_COLORS[item.category] || '#94a3b8', fillOpacity: 0.95, weight: item.recurringFlag ? 3 : 2 }}>
                      <Popup><div className="map-popup"><strong>{item.category}</strong><span>{item.id}</span><p>{item.address}</p><span className={item.recurringFlag ? 'popup-alert' : ''}>{item.recurringFlag ? 'Possible repeat · demo data' : item.status}</span><small>DEMO RECORD</small></div></Popup>
                    </CircleMarker>)}
                    {draft.lat != null && draft.lng != null && Number.isFinite(Number(draft.lat)) && Number.isFinite(Number(draft.lng)) && <CircleMarker center={[Number(draft.lat), Number(draft.lng)]} radius={11} pathOptions={{ color: '#ffffff', weight: 3, fillColor: draft.locationConfirmed ? '#25c7a3' : '#8b5cf6', fillOpacity: 1 }}><Popup><div className="map-popup"><strong>Your complaint location</strong><span>{draft.address || 'Selected pin'}</span><small>{draft.locationConfirmed ? 'PIN CONFIRMED' : 'NEEDS CONFIRMATION'}</small></div></Popup></CircleMarker>}
                  </MapContainer>
                </div>
                <div className="map-stats-strip" aria-label="Map summary">
                  <div><span>REPORTS MAPPED</span><strong>{mapPoints.length}</strong><small>With saved coordinates</small></div>
                  <div><span>ISSUE TYPES</span><strong>{mapCategoryCount}</strong><small>Categories represented</small></div>
                  <div><span>POSSIBLE REPEATS</span><strong>{mapRecurringCount}</strong><small>Within demo records</small></div>
                </div>
                <div className="map-legend" aria-label="Map legend">
                  {mapLegendItems.map(item => <span key={item.category}><i style={{ background: CATEGORY_COLORS[item.category] || '#94a3b8' }} />{item.category} <b>{item.count}</b></span>)}
                  {mapPoints.length === 0 && <span className="map-legend-empty">No geolocated reports yet</span>}
                  <span><i className="draft-pin-legend" />Current draft pin</span><span><i style={{ background: '#fb7185' }} />Recurring issue</span>
                </div>
                <div className="location-search"><div className="location-input"><Search size={16} /><input value={searchAddress} onChange={event => setSearchAddress(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); searchForLocation(); } }} placeholder="Search street, area or landmark" aria-label="Search street area or landmark" /><button onClick={searchForLocation} disabled={searchingAddress || searchAddress.trim().length < 3} aria-label="Search location">{searchingAddress ? <RefreshCw size={15} className="spin" /> : <Search size={15} />}</button></div>
                  <div className="preset-location-row" aria-label="Quick location picks">{PRESET_LOCATIONS.map(place => <button key={place.id} type="button" className="preset-location-chip" onClick={() => choosePresetLocation(place)}><MapPin size={13} />{place.label}</button>)}</div>
                  <div className="location-action-row"><button className="link-button" onClick={() => { setMapPickMode(value => !value); setNotice(mapPickMode ? '' : 'Click the map to choose the complaint location.'); }}><Plus size={14} /> {mapPickMode ? 'Cancel pin selection' : 'Pin manually on map'}</button></div>
                  <div className={`location-status-line ${locationStatus.kind}`}><span className="status-dot" />{locationStatus.text}</div>
                </div>
              </div>

              <div className="draft-panel panel">
                <div className="panel-heading"><div><h3>Complaint details</h3><p>Review before confirming</p></div><div className="heading-actions"><button className="text-action" onClick={() => setEditing(value => !value)}>{editing ? 'Done editing' : 'Edit fields'}</button>{(draft.category || draft.description) && <button className="text-action danger-text" onClick={discardDraft}>Discard draft</button>}</div></div>
                {editing ? <div className="draft-form">
                  <label>Category<select value={draft.category} onChange={event => updateDraftField('category', event.target.value)}><option value="">Choose category</option>{CATEGORY_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>
                  <label>What happened?<textarea rows="3" value={draft.description} onChange={event => updateDraftField('description', event.target.value)} placeholder="Complaint description" /></label>
                  <label>Duration<input value={draft.durationText} onChange={event => updateDraftField('durationText', event.target.value)} placeholder="e.g. 2 weeks" /></label>
                  <label>Location<input value={draft.address} onChange={event => updateDraftField('address', event.target.value)} placeholder="Street or landmark" /></label>
                  <button className="confirm-pin-button full" onClick={() => setEditing(false)}><Check size={14} /> Apply edits</button>
                </div> : <>
                  <div className="draft-fields">
                    <div className="draft-field"><div className="field-icon amber"><Zap size={15} /></div><div><span>ISSUE CATEGORY</span><strong>{draft.category || 'Waiting for your report'}</strong></div></div>
                    <div className="draft-field"><div className="field-icon blue"><Clock3 size={15} /></div><div><span>DURATION</span><strong>{draft.durationText || 'Not captured yet'}</strong></div></div>
                    <div className="draft-field"><div className="field-icon slate"><MapPin size={15} /></div><div><span>LOCATION</span><strong className="location-field-value">{draft.address || 'Awaiting location'}</strong><small>{draft.locationConfirmed ? 'Map pin confirmed' : draft.address ? 'Confirm pin on map' : 'Device permission or manual pin'}</small></div></div>
                    <div className="draft-field description-field"><div className="field-icon blue"><FileText size={15} /></div><div><span>COMPLAINT DESCRIPTION</span><strong>{draft.description || 'A short description of the issue will appear here.'}</strong></div></div>
                  </div>
                  {draft.category && draft.lat != null && <div className={`recurrence-callout ${matchingCount >= 1 ? 'alert' : ''}`}><div className="recurrence-icon">{matchingCount >= 1 ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}</div><div><strong>{matchingCount >= 1 ? 'Possible duplicate' : 'Nearby report check'}</strong><span>{matchingCount >= 1 ? `${matchingCount} similar demo report(s) are within 100 m. Review before treating them as duplicates.` : 'The demo will check for similar records near this map pin.'}</span></div></div>}
                  <div className="draft-buttons"><button className="outline-button" onClick={() => setEditing(true)}><FileText size={15} /> Review details</button><button className="primary-button" disabled={busy || !draft.category || !draft.description || !draft.durationText || !draft.locationConfirmed || !draft.address} onClick={() => { setStage('confirm'); setShowConfirmDialog(true); say(makeSummary()); }}><CheckCircle2 size={16} /> Review & confirm</button></div>
                  <div className="save-hint"><ShieldCheck size={14} /> Review the details and confirm when everything looks right.</div>
                  
                </>}
              </div>
              {savedComplaint && <div className="saved-card panel"><div className="saved-icon"><CheckCircle2 size={19} /></div><div><div className="saved-label">SAVED TO DEMO</div><strong>{savedComplaint.id}</strong><p>{savedComplaint.repeated ? `${savedComplaint.matchingCount} similar demo record(s) nearby` : 'Saved to demo records only'}</p></div><button className="icon-button" onClick={() => { navigator.clipboard?.writeText(savedComplaint.id); setNotice('Complaint ID copied.'); }} title="Copy complaint ID"><Copy size={15} /></button><button className="confirm-pin-button" onClick={startNewComplaint}><Plus size={14} /> New report</button></div>}
            </section>
          </div>
          </>
        )}

        {activeView === 'reports' && <div className="full-view-grid"><div className="metrics-row"><Metric icon={<FileText size={19} />} label="Total reports" value={stats.total} tone="blue" /><Metric icon={<AlertTriangle size={19} />} label="Possible duplicates" value={stats.recurring} tone="rose" /><Metric icon={<Activity size={19} />} label="In progress" value={stats.inProgress} tone="slate" /><Metric icon={<CheckCircle2 size={19} />} label="Resolved" value={stats.resolved} tone="green" /></div><div className="panel reports-panel"><div className="panel-heading"><div><h3>All complaint records</h3><p>Sample records for demonstration; status changes are local to this environment</p></div><button className="outline-button" onClick={fetchData}><RefreshCw size={15} /> Refresh</button></div><div className="table-wrap"><table><thead><tr><th>Complaint ID</th><th>Issue</th><th>Location</th><th>Priority</th><th>Status</th><th>Reported</th></tr></thead><tbody>{visibleComplaints.map(item => <tr key={item.id}><td><strong>{item.id}</strong><small>DEMO RECORD</small></td><td><span className="table-category"><i style={{ background: CATEGORY_COLORS[item.category] || '#94a3b8' }} />{item.category}</span>{item.recurringFlag && <span className="table-badge">Possible repeat</span>}</td><td className="table-location">{item.address}</td><td><span className={`priority-pill ${item.urgency === 'priority review' ? 'priority' : ''}`}>{item.urgency === 'priority review' ? 'Review suggested' : item.urgency}</span></td><td>{import.meta.env.DEV ? <select className="status-select" value={item.status} disabled={updatingComplaintId === item.id} onChange={event => updateComplaintStatus(item.id, event.target.value)} aria-label={`Update status for ${item.id}`} title="Demo-only status editor">{COMPLAINT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select> : <span className="status-pill">{item.status}</span>}</td><td>{timeAgo(item.createdAt)}</td></tr>)}</tbody></table></div><button className="text-action load-more" onClick={() => setShowAllReports(value => !value)}>{showAllReports ? 'Show fewer' : `Show all ${complaints.length} records`} <ChevronDown size={15} className={showAllReports ? 'rotate-up' : ''} /></button></div></div>}

        {activeView === 'status' && <div className="status-page"><div className="status-hero panel"><div className="status-hero-icon"><Navigation size={24} /></div><div><div className="section-kicker"><span className="kicker-dot" /> STATUS LOOKUP</div><h2>Where is your complaint now?</h2><p>Enter a CivicVoice demo ID to check the record’s current status in this prototype.</p></div><form className="status-search" onSubmit={runStatusLookup}><input value={statusLookup} onChange={event => setStatusLookup(event.target.value)} placeholder="e.g. CV-081" aria-label="Complaint ID" /><button className="primary-button" type="submit" disabled={!statusLookup.trim()}><Search size={16} /> Check status</button></form>{lookupResult && <div className="lookup-result"><div className="lookup-result-head"><CheckCircle2 size={18} /><strong>{lookupResult.id}</strong><span className="status-pill">{lookupResult.status}</span></div><div className="lookup-result-grid"><div><span>Issue</span><strong>{lookupResult.category}</strong></div><div><span>Location</span><strong>{lookupResult.address}</strong></div><div><span>Priority</span><strong>{lookupResult.urgency}</strong></div><div><span>Type</span><strong>Complaint record</strong></div></div></div>}<div className="status-disclaimer"><AlertTriangle size={15} /> This is a demo status, not an official municipal case update.</div></div><div className="panel sample-ids"><div className="panel-heading"><div><h3>Recent complaint IDs</h3><p>Select a recent complaint to check its status</p></div></div><div className="sample-list">{complaints.slice(0, 5).map(item => <button key={item.id} onClick={() => setStatusLookup(item.id)}><div><strong>{item.id}</strong><span>{item.category} · {item.address}</span></div><ChevronDown size={16} className="sample-arrow" /></button>)}</div></div></div>}

        <footer className="app-footer"><span>© CivicVoice · Civic issue reporting prototype</span><span>Not connected to a municipal system</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Map data © OpenStreetMap</a></footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, tone }) {
  return <div className="metric-card panel"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>In demo dataset</small></div></div>;
}
function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default App;
