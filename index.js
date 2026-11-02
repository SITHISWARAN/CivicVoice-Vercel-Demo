import 'dotenv/config';
import { classifyComplaint } from './classification.js';
import { extractLocationFromNarrative, looksLikePlace, removeNumericDurationFromLocation } from './location-parser.js';
import { conversationalIssueResponse } from './conversation-response.js';
import { validateComplaintSubmission } from './complaint-validation.js';
import { resolveTtsVoice } from './tts-voices.js';
import { DEMO_CASES } from './demo-data.js';
import express from 'express';
import { isDurationUnitOnly, parseBareNumber, parseDuration, parseDurationUnitOnly, parseYesNo } from './complaint-parsing.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import Database from 'better-sqlite3';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const STATUS_OPTIONS = ['Received', 'Awaiting review', 'In progress', 'Resolved'];
const API_KEY = process.env.GNANI_API_KEY || '';
const STT_URL = process.env.GNANI_STT_URL || 'https://api.vachana.ai/stt/v3';
const TTS_URL = process.env.GNANI_TTS_URL || 'https://api.vachana.ai/api/v1/tts/inference';
const TTS_MODEL = process.env.GNANI_TTS_MODEL || 'timbre-v2.5';
const configuredTtsSpeed = Number(process.env.GNANI_TTS_SPEED ?? 1.15);
const TTS_SPEED = Number.isFinite(configuredTtsSpeed) ? Math.max(0.85, Math.min(1.15, configuredTtsSpeed)) : 1.15;
const ALLOWED_TTS_BITRATES = new Set(['32k', '64k', '96k', '128k', '192k']);
const TTS_BITRATE = ALLOWED_TTS_BITRATES.has(process.env.GNANI_TTS_BITRATE || '128k') ? (process.env.GNANI_TTS_BITRATE || '128k') : '128k';
const ALLOWED_TTS_SAMPLE_RATES = new Set([8000, 16000, 22050, 24000, 44100, 48000]);
const TTS_SAMPLE_RATE = ALLOWED_TTS_SAMPLE_RATES.has(Number(process.env.GNANI_TTS_SAMPLE_RATE || 48000)) ? Number(process.env.GNANI_TTS_SAMPLE_RATE || 48000) : 48000;
const TTS_VOICE_TA = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_TA', 'ta-IN');
const TTS_VOICE_TE = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_TE', 'te-IN');
const TTS_VOICE_EN = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_EN', 'en-IN');
const TTS_VOICE_HI = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_HI', 'hi-IN');
const TTS_VOICE_HINGLISH = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_HINGLISH', 'hi-Latn');
const TTS_VOICE_KN = resolveTtsVoice(process.env, 'GNANI_TTS_VOICE_KN', 'kn-IN');
const GEOCODING_CONTACT = process.env.GEOCODING_CONTACT || '';
const dbDir = process.env.CIVICVOICE_DATA_DIR || path.join(__dirname, 'data');
mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, 'civicvoice.db'));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } });

// SQLite schema and deterministic local seed data.
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_text TEXT DEFAULT '',
  duration_days INTEGER,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'standard',
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Received',
  is_synthetic INTEGER NOT NULL DEFAULT 1,
  recurring_count INTEGER NOT NULL DEFAULT 1,
  recurring_flag INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'synthetic',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
`);

// Two named test locations make voice-to-map behaviour deterministic during development.
// These are map coordinates only; they are not evidence that a public authority is connected.
const PRESET_LOCATIONS = [
  {
    id: 'anna-nagar-second-street',
    displayName: 'Anna Nagar 2nd Street, Anna Nagar, Chennai, Tamil Nadu, India',
    shortName: 'Anna Nagar · 2nd Street', lat: 13.08518, lng: 80.21022,
    aliases: ['anna nagar second street', 'anna nagar 2nd street', 'anna nagar 2nd st', 'அண்ணா நகர் செகண்ட் ஸ்ட்ரீட்', 'அண்ணா நகர் இரண்டாவது தெரு', 'அண்ணா நகர் 2வது தெரு', 'அண்ணா நகர் இரண்டாம் தெரு']
  },
  {
    id: 'mogappair-main-road',
    displayName: 'Mogappair Main Road, Mogappair, Chennai, Tamil Nadu, India',
    shortName: 'Mogappair · Main Road', lat: 13.08350, lng: 80.17650,
    aliases: ['mogappair main road', 'mogappair main rd', 'முகப்பேர் மெயின் ரோடு', 'மோகப்பேர் மெயின் ரோடு', 'மொகப்பேர் மெயின் ரோடு']
  }
];
function normalizeLocationText(value) {
  return String(value || '').toLowerCase().replace(/[.,;:!?()\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
}
function findPresetLocation(value) {
  const text = normalizeLocationText(value);
  if (!text) return null;
  const direct = PRESET_LOCATIONS.find(place => place.aliases.some(alias => text.includes(normalizeLocationText(alias))));
  if (direct) return direct;
  const anna = /anna\s*nagar|அண்ணா\s*நகர்/.test(text);
  const second = /second|2nd|2\s*வது|இரண்டாவது|இரண்டாம்|செகண்ட்/.test(text);
  const street = /street|\bst\b|theru|தெரு|ஸ்ட்ரீட்/.test(text);
  if (anna && second && street) return PRESET_LOCATIONS[0];
  const mogappair = /mogappair|முகப்பேர்|மோகப்பேர்|மொகப்பேர்/.test(text);
  const mainRoad = /main\s*road|main\s*rd|மெயின்\s*ரோடு|மெயின்\s*ரோடு/.test(text);
  if (mogappair && mainRoad) return PRESET_LOCATIONS[1];
  return null;
}
function publicPresetLocation(place) {
  return { id: place.id, displayName: place.displayName, shortName: place.shortName, lat: place.lat, lng: place.lng };
}

const categories = [
  { category: 'Streetlight', department: 'Streetlight maintenance', icon: 'lightbulb' },
  { category: 'Water supply', department: 'Water supply services', icon: 'droplets' },
  { category: 'Water leakage', department: 'Water supply and drainage', icon: 'droplets' },
  { category: 'Water quality', department: 'Drinking water quality services', icon: 'flask-conical' },
  { category: 'Drainage', department: 'Drainage maintenance', icon: 'waves' },
  { category: 'Open manhole', department: 'Drain and manhole safety maintenance', icon: 'alert-triangle' },
  { category: 'Stormwater flooding', department: 'Stormwater and flood management', icon: 'cloud-rain' },
  { category: 'Garbage', department: 'Sanitation and waste management', icon: 'trash-2' },
  { category: 'Pothole', department: 'Road maintenance', icon: 'construction' },
  { category: 'Road damage', department: 'Road maintenance', icon: 'road' },
  { category: 'Road obstruction', department: 'Road obstruction clearance', icon: 'construction' },
  { category: 'Road signage', department: 'Road signage maintenance', icon: 'signpost' },
  { category: 'Illegal parking', department: 'Traffic and parking enforcement', icon: 'car-front' },
  { category: 'Footpath damage', department: 'Footpath and accessibility maintenance', icon: 'accessibility' },
  { category: 'Power outage', department: 'Electricity service', icon: 'zap' },
  { category: 'Traffic signal', department: 'Traffic signal maintenance', icon: 'traffic-cone' },
  { category: 'Public toilet', department: 'Public sanitation facilities', icon: 'building-2' },
  { category: 'Mosquito nuisance', department: 'Vector control and public health', icon: 'bug' },
  { category: 'Stray animals', department: 'Animal welfare services', icon: 'paw-print' },
  { category: 'Fallen tree', department: 'Tree and storm-response services', icon: 'trees' },
  { category: 'Construction debris', department: 'Public-space and waste management', icon: 'hard-hat' },
  { category: 'Illegal dumping', department: 'Illegal dumping and sanitation enforcement', icon: 'trash-2' },
  { category: 'Air pollution', department: 'Air quality and pollution control', icon: 'wind' },
  { category: 'Public transport facility', department: 'Public transport infrastructure maintenance', icon: 'bus' },
  { category: 'Public infrastructure', department: 'Public infrastructure maintenance', icon: 'building-2' },
  { category: 'Noise nuisance', department: 'Public nuisance review', icon: 'volume-2' },
  { category: 'Park maintenance', department: 'Parks and public spaces', icon: 'trees' },
  { category: 'Public safety', department: 'Local safety review', icon: 'shield-alert' },
  { category: 'Other', department: 'CivicVoice review', icon: 'circle-help' }
];
const SAMPLE_DESCRIPTIONS = {
  'Streetlight': ['Streetlight not working after sunset; the lane is poorly lit.', 'Streetlamp keeps switching off near the junction.', 'Several streetlights appear unlit along the residential road.'],
  'Water supply': ['No water supply to homes during the usual morning hours.', 'Water pressure is very low in the lane.', 'Scheduled water supply has not arrived at the neighbourhood taps.'],
  'Water quality': ['Drinking water is muddy and has a foul smell.', 'Yellow-coloured water is coming from household taps.', 'Residents report possible drinking-water contamination.'],
  'Water leakage': ['Water is leaking continuously from a roadside pipe.', 'A leaking public tap is wasting water onto the road.', 'Water is collecting near a damaged supply pipe.'],
  'Drainage': ['Drainage is blocked and wastewater is not flowing.', 'Sewage is backing up near the homes and causing a bad smell.', 'A blocked drain is holding stagnant wastewater beside the street.'],
  'Open manhole': ['An uncovered manhole is exposed on the pedestrian route.', 'A manhole cover is missing near the junction.', 'A broken drain cover creates a fall hazard.'],
  'Stormwater flooding': ['Rainwater is collecting on the road and blocking pedestrian access.', 'Stormwater drain overflows during rain near the junction.', 'Waterlogging remains on the street after the rainfall.'],
  'Garbage': ['Garbage has not been collected and bags are piling up.', 'Mixed waste is overflowing from the roadside collection point.', 'Waste has remained near the bin and is attracting animals.'],
  'Pothole': ['A deep pothole makes the road unsafe for two-wheelers.', 'Multiple potholes are difficult to see after rain.', 'A road depression is creating a hazard for cyclists and vehicles.'],
  'Road damage': ['Road surface is broken and loose gravel is spreading.', 'A section of the road has cracked and needs repair.', 'Damaged road surfacing is slowing traffic and creating hazards.'],
  'Road obstruction': ['Debris is blocking the road and restricting access.', 'An object is obstructing the roadway near a junction.', 'Road access is blocked and needs safe clearance.'],
  'Road signage': ['The street-name board is missing.', 'A traffic sign is damaged and hard to read.', 'The road direction sign is faded and no longer clear.'],
  'Illegal parking': ['Vehicles are parked on the footpath, blocking pedestrians.', 'A vehicle is blocking a building entrance.', 'Repeated illegal parking is obstructing the lane.'],
  'Footpath damage': ['Broken footpath tiles make walking difficult.', 'The footpath is uneven and inaccessible for wheelchair users.', 'A damaged pavement forces pedestrians to walk on the road.'],
  'Power outage': ['Power has been unavailable in the street since the reported time.', 'Repeated power cuts are affecting homes in this area.', 'A local electricity outage needs inspection.'],
  'Traffic signal': ['Traffic signal is not changing at the junction.', 'The signal lights are not visible or functioning correctly.', 'Traffic signal failure is causing confusion at the crossing.'],
  'Public toilet': ['Public toilet needs cleaning and basic maintenance.', 'The public restroom has no running water.', 'A public toilet facility is closed or unusable.'],
  'Mosquito nuisance': ['Stagnant water is attracting mosquitoes near homes.', 'Mosquito nuisance has increased around the neighbourhood.', 'Standing water near the drain needs attention to reduce mosquitoes.'],
  'Stray animals': ['Stray animals are gathering near the school entrance.', 'An injured stray animal needs attention.', 'Stray cattle are obstructing traffic on the road.'],
  'Fallen tree': ['A fallen tree branch is blocking part of the road.', 'A storm-damaged tree is leaning over the footpath.', 'Tree debris is obstructing pedestrian access.'],
  'Construction debris': ['Construction debris has been left on the public footpath.', 'Building material is spilling into the roadway.', 'Rubble from nearby work is blocking pedestrian access.'],
  'Illegal dumping': ['Waste is being dumped illegally on the roadside.', 'Garbage is repeatedly dumped in a public area.', 'Unauthorized waste dumping is attracting pests.'],
  'Air pollution': ['Smoke from burning waste is affecting nearby homes.', 'Dust and smoke are causing poor air quality.', 'Strong smoke from a nearby source is affecting residents.'],
  'Public transport facility': ['The bus shelter roof is broken.', 'The bus stop shelter is damaged and needs repair.', 'A public bus-stop facility is unsafe to use.'],
  'Public infrastructure': ['A public bench is broken and unsafe.', 'A damaged railing needs repair along a public walkway.', 'A public staircase or fixture is damaged.'],
  'Noise nuisance': ['Loud noise continues late at night in the residential area.', 'Persistent construction noise is disturbing nearby homes.', 'A recurring noise nuisance needs a local review.'],
  'Park maintenance': ['The neighbourhood park equipment is damaged.', 'Park paths and public seating need maintenance.', 'Overgrown plants are blocking the walking path in the park.'],
  'Public safety': ['A dangerous exposed wire is accessible from the public path.', 'A broken public fixture may injure passers-by.', 'A hazardous obstruction needs attention near a pedestrian route.'],
  'Other': ['A civic maintenance issue needs review.', 'A public-service issue was reported in the local area.', 'A neighbourhood maintenance concern needs to be checked.']
};
const areas = [
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
  { name: 'Mogappair', lat: 13.0835, lng: 80.1765 },
  { name: 'Kilpauk', lat: 13.0830, lng: 80.2430 },
  { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
  { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery', lat: 12.9750, lng: 80.2212 },
  { name: 'Adyar', lat: 13.0067, lng: 80.2570 },
  { name: 'Mylapore', lat: 13.0368, lng: 80.2676 }
];
const seed = db.prepare(`INSERT OR IGNORE INTO complaints
(id, category, description, duration_text, duration_days, address, lat, lng, urgency, department, status, is_synthetic, recurring_count, recurring_flag, source, created_at)
VALUES (@id, @category, @description, @duration_text, @duration_days, @address, @lat, @lng, @urgency, @department, @status, 1, @recurring_count, @recurring_flag, 'synthetic', @created_at)`);
const existingCount = db.prepare('SELECT COUNT(*) AS count FROM complaints').get().count;
if (existingCount === 0) {
  const now = Date.now();
  const day = 86_400_000;
  // A deliberate recurring streetlight cluster near Anna Nagar makes the workflow easy to verify.
  const cluster = [
    { lat: 13.08500, lng: 80.21010, days: 14, description: 'Streetlight near the residential junction has been off after sunset for about two weeks.' },
    { lat: 13.08518, lng: 80.21022, days: 18, description: 'The streetlight on this stretch is still not working in the evening.' },
    { lat: 13.08488, lng: 80.20994, days: 9, description: 'A nearby streetlight has remained off for several evenings.' }
  ];
  cluster.forEach((p, i) => seed.run({
    id: `CV-${String(i + 1).padStart(3, '0')}`, category: 'Streetlight',
    description: p.description,
    duration_text: `${p.days} days`, duration_days: p.days, address: 'Anna Nagar, Chennai',
    lat: p.lat, lng: p.lng, urgency: 'priority review', department: 'Streetlight maintenance',
    status: 'Awaiting review', recurring_count: 3, recurring_flag: 1,
    created_at: new Date(now - (i + 1) * day).toISOString()
  }));
  const categoryByName = new Map(categories.map(item => [item.category, item]));
  const areaByName = new Map(areas.map(area => [area.name, area]));
  DEMO_CASES.forEach((sample, index) => {
    const area = areaByName.get(sample.area);
    const item = categoryByName.get(sample.category);
    if (!area || !item) return;
    // The map coordinates are approximate area-level points, not claimed street addresses.
    const lat = area.lat + (((index % 5) - 2) * 0.00018);
    const lng = area.lng + ((((index * 3) % 5) - 2) * 0.00019);
    const days = sample.durationDays;
    seed.run({
      id: `CV-${String(index + 4).padStart(3, '0')}`,
      category: sample.category,
      description: sample.description,
      duration_text: `${days} day${days === 1 ? '' : 's'}`,
      duration_days: days,
      address: `${area.name}, Chennai`,
      lat, lng,
      urgency: sample.urgency || 'standard',
      department: item.department,
      status: sample.status,
      recurring_count: sample.recurringCount || 1,
      recurring_flag: sample.recurringFlag ? 1 : 0,
      created_at: new Date(now - sample.reportedDaysAgo * day).toISOString()
    });
  });
}


// Bring older local databases up to date without duplicating their existing category details.
// Each older generic category receives a couple of richer workspace examples; records remain local.
{
  const categoryStats = db.prepare('SELECT category, COUNT(*) AS total, SUM(CASE WHEN description NOT LIKE ? THEN 1 ELSE 0 END) AS detailed FROM complaints GROUP BY category');
  const currentStats = new Map(categoryStats.all('%reported in the local area%').map(row => [row.category, row]));
  let nextN = Number(db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(id, 4) AS INTEGER)), 0) AS n FROM complaints WHERE id LIKE 'CV-%'").get().n) + 1;
  const now = Date.now();
  const day = 86_400_000;
  categories.forEach((item, index) => {
    const stats = currentStats.get(item.category);
    if (stats && Number(stats.detailed || 0) > 0) return;
    const existingForCategory = Number(stats?.total || 0);
    const targetExtras = stats ? 1 : Math.min(2, SAMPLE_DESCRIPTIONS[item.category].length);
    for (let j = 0; j < targetExtras; j += 1) {
      const area = areas[(index * 3 + j * 2) % areas.length];
      const dx = (((index * 5 + j * 3) % 9) - 4) * 0.00045;
      const dy = (((index * 7 + j * 2) % 9) - 4) * 0.00042;
      seed.run({
        id: `CV-${String(nextN++).padStart(3, '0')}`, category: item.category,
        description: SAMPLE_DESCRIPTIONS[item.category][(existingForCategory + j) % SAMPLE_DESCRIPTIONS[item.category].length],
        duration_text: `${[1, 2, 3, 7, 14][(index + j) % 5]} days`, duration_days: [1, 2, 3, 7, 14][(index + j) % 5],
        address: `${area.name}, Chennai`, lat: area.lat + dy, lng: area.lng + dx,
        urgency: (index + j) % 9 === 0 ? 'priority review' : 'standard', department: item.department,
        status: ['Received', 'Awaiting review', 'In progress', 'Resolved'][(index + j) % 4],
        recurring_count: 1, recurring_flag: 0,
        created_at: new Date(now - ((index + j + 1) * day)).toISOString()
      });
    }
  });
}


// Compact legacy date-based identifiers to CV-001, CV-002, ... without losing records.
// The app stores no foreign-key references to complaint IDs, so a temporary key pass avoids collisions.
const needsCompactIds = db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE id NOT LIKE 'CV-___' AND id NOT LIKE 'CV-____' AND id NOT LIKE 'CV-_____' AND id NOT LIKE 'CV-______'").get().n > 0;
if (needsCompactIds) {
  const rowsToRename = db.prepare('SELECT id FROM complaints ORDER BY created_at ASC, id ASC').all();
  const setId = db.prepare('UPDATE complaints SET id = ? WHERE id = ?');
  const migrationStamp = Date.now();
  const migrateIds = db.transaction(() => {
    rowsToRename.forEach((row, i) => setId.run(`TMP-CV-${migrationStamp}-${i}`, row.id));
    rowsToRename.forEach((row, i) => setId.run(`CV-${String(i + 1).padStart(3, '0')}`, `TMP-CV-${migrationStamp}-${i}`));
  });
  migrateIds();
}

const allComplaints = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC');
const getComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?');
const insertComplaint = db.prepare(`INSERT INTO complaints
(id, category, description, duration_text, duration_days, address, lat, lng, urgency, department, status, is_synthetic, recurring_count, recurring_flag, source, created_at)
VALUES (@id, @category, @description, @duration_text, @duration_days, @address, @lat, @lng, @urgency, @department, 'Received', 0, @recurring_count, @recurring_flag, 'citizen', @created_at)`);
const updateRecurring = db.prepare('UPDATE complaints SET recurring_count = ?, recurring_flag = 1, urgency = \'priority review\' WHERE id = ?');

function publicComplaint(row) {
  if (!row) return null;
  return {
    id: row.id, category: row.category, description: row.description,
    durationText: row.duration_text || '', durationDays: row.duration_days,
    address: row.address, lat: row.lat, lng: row.lng, urgency: row.urgency,
    department: row.department, status: row.status,
    recurringCount: row.recurring_count, recurringFlag: Boolean(row.recurring_flag),
    createdAt: row.created_at
  };
}
function getDepartment(category) {
  return categories.find(c => c.category === category)?.department || 'CivicVoice review';
}
function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function parseSafety(text) {
  const s = String(text || '').toLowerCase();
  if (/\bno\b|\billa\b|இல்லை|வேண்டாம்|கிடையாது|కాదు|లేదు|not dangerous|not unsafe|\bsafe\b|பிரச்சினை இல்லை|సేఫ్/.test(s)) return false;
  if (/\byes\b|aama|ஆமாம்|ஆம்|అవును|danger|dark|unsafe|risk|exposed wire|shock|ஆபத்து|பயம்|ప్రమాదం|చీకటి/.test(s)) return true;
  return null;
}
const CATEGORY_SUGGESTION_LABELS = {
  'Pothole': {
    'ta-IN': 'சாலைப் பள்ளம்', 'ta-Latn': 'road-la pallam', 'te-IN': 'రోడ్డు గుంత', 'te-Latn': 'road meeda gunta',
    'hi-IN': 'सड़क पर गड्ढा', 'hi-Latn': 'sadak par gaddha', 'kn-IN': 'ರಸ್ತೆಯ ಗುಂಡಿ', 'en-IN': 'pothole'
  },
  'Water leakage': {
    'ta-IN': 'தண்ணீர் குழாய் கசிவு', 'ta-Latn': 'water pipe leak', 'te-IN': 'నీటి పైపు లీక్', 'te-Latn': 'water pipe leak',
    'hi-IN': 'पानी की पाइप में रिसाव', 'hi-Latn': 'paani ki pipe leak', 'kn-IN': 'ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ', 'en-IN': 'water leakage'
  },
  'Water supply': {
    'ta-IN': 'குடிநீர் விநியோகப் பிரச்சினை', 'ta-Latn': 'thanni supply problem', 'te-IN': 'నీటి సరఫరా సమస్య', 'te-Latn': 'neella supply problem',
    'hi-IN': 'पानी की सप्लाई की समस्या', 'hi-Latn': 'paani supply problem', 'kn-IN': 'ನೀರಿನ ಸರಬರಾಜಿನ ಸಮಸ್ಯೆ', 'en-IN': 'water supply issue'
  },
  'Water quality': {
    'ta-IN': 'குடிநீரின் தரப் பிரச்சினை', 'ta-Latn': 'drinking water quality problem', 'te-IN': 'తాగునీటి నాణ్యత సమస్య', 'te-Latn': 'drinking water quality problem',
    'hi-IN': 'पीने के पानी की गुणवत्ता की समस्या', 'hi-Latn': 'peene ke paani ki quality problem', 'kn-IN': 'ಕುಡಿಯುವ ನೀರಿನ ಗುಣಮಟ್ಟದ ಸಮಸ್ಯೆ', 'en-IN': 'water quality issue'
  },
  'Drainage': {
    'ta-IN': 'வடிகால் அடைப்பு', 'ta-Latn': 'sakkadai block', 'te-IN': 'డ్రైనేజీ బ్లాక్', 'te-Latn': 'drainage block',
    'hi-IN': 'नाली जाम होना', 'hi-Latn': 'naali block hona', 'kn-IN': 'ಚರಂಡಿ ಮುಚ್ಚಿರುವುದು', 'en-IN': 'blocked drainage'
  },
  'Stormwater flooding': {
    'ta-IN': 'மழைநீர் தேக்கம்', 'ta-Latn': 'mazhai thanni theengura problem', 'te-IN': 'వర్షపు నీరు నిలిచే సమస్య', 'te-Latn': 'varshapu neellu nilavadam',
    'hi-IN': 'बारिश का पानी जमा होना', 'hi-Latn': 'baarish ka paani jama hona', 'kn-IN': 'ಮಳೆನೀರು ನಿಲ್ಲುವ ಸಮಸ್ಯೆ', 'en-IN': 'rainwater collecting on the road'
  },
  'Streetlight': {
    'ta-IN': 'தெருவிளக்கு பழுது', 'ta-Latn': 'theru light velai seiyala', 'te-IN': 'వీధి లైట్ పని చేయడం లేదు', 'te-Latn': 'veedhi light pani cheyatledu',
    'hi-IN': 'स्ट्रीट लाइट खराब होना', 'hi-Latn': 'street light kharab hona', 'kn-IN': 'ಬೀದಿ ದೀಪ ಕೆಲಸ ಮಾಡದಿರುವುದು', 'en-IN': 'streetlight issue'
  },
  'Garbage': {
    'ta-IN': 'குப்பை அகற்றப்படாத பிரச்சினை', 'ta-Latn': 'kuppai edukkaadha problem', 'te-IN': 'చెత్త తొలగించని సమస్య', 'te-Latn': 'chetta clear cheyani problem',
    'hi-IN': 'कचरा साफ न होने की समस्या', 'hi-Latn': 'kachra saaf na hone ki problem', 'kn-IN': 'ಕಸ ತೆರವುಗೊಳಿಸದ ಸಮಸ್ಯೆ', 'en-IN': 'garbage collection issue'
  }
};
function localizedCategorySuggestion(language, category) {
  return CATEGORY_SUGGESTION_LABELS[category]?.[language] || category;
}

const workflowCopy = (language, key, details = {}) => {
  const suggestions = details.suggestions || 'the issue type';
  const n = details.number ?? '';
  const messages = {
    'ta-IN': {
      cancelled: 'உறுதிப்படுத்தாத புகார் வரைவு நீக்கப்பட்டது. எதுவும் சேமிக்கப்படவில்லை.',
      durationNumber: () => `எண் ${n} என்று கேட்டேன். அது நாட்களா, வாரங்களா அல்லது மாதங்களா?`,
      confirmNo: 'சரி. எந்த விவரத்தை மாற்ற வேண்டும் என்று சொல்லுங்கள் அல்லது புகார் விவரங்களைத் திருத்துங்கள்.',
      confirmAsk: 'சேமிக்க “ஆம்” என்று சொல்லுங்கள் அல்லது மாற்ற வேண்டிய விவரத்தைச் சொல்லுங்கள்.',
      uncertainCategory: () => `பிரச்சினை வகையைத் துல்லியமாகத் தேர்வு செய்ய இன்னும் ஒரு விவரம் சொல்லுங்கள். சாத்தியமான வகைகள்: ${suggestions}. தேவையெனில் வகையை கைமுறையாகத் தேர்வு செய்யலாம்.`
    },
    'ta-Latn': {
      cancelled: 'Confirm pannadha complaint draft clear pannitten. Edhuvum save aagala.',
      durationNumber: () => `${n} nu ketten. Adhu days-aa, weeks-aa, illa months-aa?`,
      confirmNo: 'Parava illa. Endha detail-a change pannanum-nu sollunga illa complaint details-a edit pannunga.',
      confirmAsk: 'Save panna “yes” sollunga; illenna change panna vendiya detail-a sollunga.',
      uncertainCategory: () => `Problem category correct-a select panna innum oru detail sollunga. Possible types: ${suggestions}. Thevai-na category-a manual-a select pannalaam.`
    },
    'te-IN': {
      cancelled: 'నిర్ధారించని ఫిర్యాదు డ్రాఫ్ట్ తొలగించబడింది. ఏదీ సేవ్ చేయలేదు.',
      durationNumber: () => `${n} అని విన్నాను. అది రోజులు, వారాలు లేదా నెలలా?`,
      confirmNo: 'సరే. ఏ వివరాన్ని మార్చాలో చెప్పండి లేదా ఫిర్యాదు వివరాలను సవరించండి.',
      confirmAsk: 'సేవ్ చేయడానికి “అవును” అని చెప్పండి లేదా మార్చాల్సిన వివరాన్ని చెప్పండి.',
      uncertainCategory: () => `సమస్య రకాన్ని సరిగ్గా గుర్తించడానికి ఇంకో వివరాన్ని చెప్పండి. సాధ్యమైన రకాలు: ${suggestions}. అవసరమైతే వర్గాన్ని చేతితో ఎంచుకోవచ్చు.`
    },
    'te-Latn': {
      cancelled: 'Confirm cheyyani complaint draft clear ayyindi. Emi save cheyyaledu.',
      durationNumber: () => `${n} ani vinnanu. Adi days, weeks, leka months-aa?`,
      confirmNo: 'Sare. Ye detail marchalo cheppandi, leka complaint details edit cheyyandi.',
      confirmAsk: 'Save cheyadaniki “avunu” ani cheppandi, leka marchalsina detail cheppandi.',
      uncertainCategory: () => `Problem category correct-ga select cheyadaniki inko detail cheppandi. Possible types: ${suggestions}. Kavali ante category manual-ga select cheyyandi.`
    },
    'hi-IN': {
      cancelled: 'आपकी अपुष्ट शिकायत का ड्राफ्ट हटा दिया गया है। कुछ भी सेव नहीं किया गया।',
      durationNumber: () => `${n} सुना। यह दिन, हफ्ते या महीने हैं?`,
      confirmNo: 'ठीक है। कौन-सी जानकारी बदलनी है बताएं या शिकायत का विवरण संपादित करें।',
      confirmAsk: 'सेव करने के लिए “हाँ” कहें, या बताएं कि कौन-सी जानकारी बदलनी है।',
      uncertainCategory: () => `समस्या की सही श्रेणी चुनने के लिए एक और विवरण बताएं। संभावित श्रेणियाँ: ${suggestions}। चाहें तो श्रेणी खुद चुन सकते हैं।`
    },
    'hi-Latn': {
      cancelled: 'Unconfirmed complaint draft clear kar diya. Kuch bhi save nahi hua.',
      durationNumber: () => `${n} suna. Ye days, weeks, ya months hain?`,
      confirmNo: 'Theek hai. Kaunsi detail change karni hai bataiye ya complaint details edit kijiye.',
      confirmAsk: 'Save karne ke liye “haan” boliye, ya bataiye kaunsi detail badalni hai.',
      uncertainCategory: () => `Problem category sahi select karne ke liye ek aur detail bataiye. Possible types: ${suggestions}. Aap category manually bhi chun sakte hain.`
    },
    'kn-IN': {
      cancelled: 'ನಿಮ್ಮ ದೃಢೀಕರಿಸದ ದೂರು ಕರಡು ಅಳಿಸಲಾಗಿದೆ. ಯಾವುದನ್ನೂ ಉಳಿಸಲಾಗಿಲ್ಲ.',
      durationNumber: () => `${n} ಎಂದು ಕೇಳಿದೆ. ಅದು ದಿನಗಳು, ವಾರಗಳು ಅಥವಾ ತಿಂಗಳುಗಳಾ?`,
      confirmNo: 'ಸರಿ. ಯಾವ ವಿವರವನ್ನು ಬದಲಾಯಿಸಬೇಕು ಎಂದು ಹೇಳಿ ಅಥವಾ ದೂರಿನ ವಿವರಗಳನ್ನು ತಿದ್ದಿ.',
      confirmAsk: 'ಉಳಿಸಲು “ಹೌದು” ಎಂದು ಹೇಳಿ, ಅಥವಾ ಬದಲಾಯಿಸಬೇಕಾದ ವಿವರವನ್ನು ತಿಳಿಸಿ.',
      uncertainCategory: () => `ಸಮಸ್ಯೆಯ ಸರಿಯಾದ ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ಇನ್ನೊಂದು ವಿವರ ಹೇಳಿ. ಸಾಧ್ಯವಾದ ವರ್ಗಗಳು: ${suggestions}. ಬೇಕಾದರೆ ವರ್ಗವನ್ನು ಕೈಯಿಂದ ಆಯ್ಕೆ ಮಾಡಬಹುದು.`
    },
    'en-IN': {
      cancelled: 'Your unconfirmed complaint draft was cleared. Nothing was saved.',
      durationNumber: () => `I heard ${n}. Is that days, weeks, or months?`,
      confirmNo: 'No problem. Tell me which detail to change, or edit the complaint details.',
      confirmAsk: 'Say “yes” to save, or tell me which detail needs changing.',
      uncertainCategory: () => `Please add one detail so I can choose the right category. Possible types: ${suggestions}. You can also choose a category manually.`
    }
  };
  const keyLanguage = messages[language] ? language
    : language.startsWith('ta') ? 'ta-IN'
      : language.startsWith('te') ? 'te-IN'
        : language.startsWith('hi') ? 'hi-IN'
          : language.startsWith('kn') ? 'kn-IN' : 'en-IN';
  const value = messages[keyLanguage]?.[key];
  return typeof value === 'function' ? value(details) : value;
};

const localeCopyHistory = new Map();
function localeCopy(language, key, details = {}) {
  const lang = String(language || 'ta-IN');
  const ta = {
    askComplaint: ['என்ன பிரச்சினை ஏற்பட்டுள்ளது? சொல்லுங்கள்.', 'எந்தப் பிரச்சினையைப் பதிவு செய்ய வேண்டும்? விவரமாகச் சொல்லுங்கள்.', 'சரி, என்ன நடந்தது என்று உங்கள் வார்த்தைகளில் சொல்லுங்கள்.'],
    askCategory: ['சரி, இன்னும் கொஞ்சம் விளக்கமாகச் சொல்ல முடியுமா?', 'புரிந்துகொள்ள உதவும் ஒரு சிறிய விவரம் சொல்லுங்கள்.', 'இந்தப் பிரச்சினை எப்படி இருக்கிறது என்று கொஞ்சம் சொல்லுங்கள்.'],
    askLocation: ['இந்தப் பிரச்சினை எந்தத் தெரு அல்லது பகுதியில் உள்ளது? அருகிலுள்ள அடையாளத்தையும் சொல்லுங்கள்.', 'சரி, சரியான இடத்தை வரைபடத்தில் குறிக்க தெரு, பகுதி அல்லது அருகிலுள்ள இடத்தின் பெயரைச் சொல்லுங்கள்.', 'எந்தப் பகுதி இது? தெருப் பெயர் அல்லது அருகிலுள்ள கடை/பள்ளி போன்ற அடையாளம் இருந்தால் சொல்லுங்கள்.'],
    askPin: ['வரைபடத்தில் ஒரு இடத்தைத் தேர்ந்தெடுத்துள்ளேன். பின் சரியான இடத்தில் உள்ளதா என்று பார்த்து உறுதிப்படுத்துங்கள்.', 'இந்த இடம் பொருத்தமாகத் தெரிகிறது. வரைபடப் பின்னைச் சரிபார்த்து உறுதி செய்ய முடியுமா?', 'இடத்தை வரைபடத்தில் குறித்துள்ளேன். அது உங்கள் புகார் இடம்தானா? உறுதிப்படுத்துங்கள்.'],
    askDuration: ['இந்தப் பிரச்சினை எத்தனை நாட்களாக உள்ளது?', 'எப்போது முதல் இந்தப் பிரச்சினை இருக்கிறது? எத்தனை நாட்கள் ஆனது?', 'இந்தச் சிக்கல் எவ்வளவு காலமாக நீடிக்கிறது? நாட்கள் அல்லது வாரங்களாகச் சொல்லுங்கள்.'],
    askDurationUnit: ['எண் புரிந்தது. அது நாட்களா, வாரங்களா அல்லது மாதங்களா?', 'சரி. நீங்கள் சொன்ன எண்ணிக்கை எந்தக் கால அளவு — நாட்கள், வாரங்கள், மாதங்களா?'],
    askConfirm: [d => `சரி, ${d.category || 'பிரச்சினை'} புகார். இடம்: ${d.address || 'இடம் இன்னும் உறுதியாகவில்லை'}. காலம்: ${d.durationText || 'குறிப்பிடப்படவில்லை'}. இதைப் பதிவு செய்யலாமா?`, d => `விவரங்களைச் சரிபார்த்துக்கொள்கிறேன்: ${d.category || 'பிரச்சினை'}, ${d.address || 'இடம் தேர்வு செய்யப்படவில்லை'}, ${d.durationText || 'காலம் குறிப்பிடப்படவில்லை'}. சரியாக இருந்தால் சேமிக்கலாமா?`, d => `புகார் விவரம் தயார் — ${d.category || 'பிரச்சினை'}, ${d.durationText || 'காலம் தெரியவில்லை'}, ${d.address || 'இடம் உறுதி செய்யப்படவில்லை'}. இதை உறுதிப்படுத்துகிறீர்களா?`],
    saved: 'உங்கள் புகார் CivicVoice-ல் பதிவு செய்யப்பட்டது.',
    retry: ['மன்னிக்கவும், அந்த விவரம் தெளிவாகப் புரியவில்லை. இன்னொரு முறை சொல்ல முடியுமா?', 'சில சொற்கள் தெளிவாக இல்லை. சற்று மெதுவாக மீண்டும் சொல்லுங்கள்.', 'உங்கள் பதிலை முழுமையாகப் புரிந்துகொள்ளவில்லை. மீண்டும் முயற்சிக்கலாம்.'],
    locationNotFound: ['அந்த இடத்தைத் துல்லியமாகக் கண்டுபிடிக்க முடியவில்லை. அருகிலுள்ள அடையாளத்தைக் கூறுங்கள் அல்லது வரைபடத்தில் பின்னைத் தேர்ந்தெடுங்கள்.', 'முகவரி பொருந்தவில்லை. தெருப் பெயர், பகுதி அல்லது அருகிலுள்ள முக்கிய இடத்தைச் சொல்லுங்கள்; வேண்டுமென்றால் வரைபடத்தில் பின்னை வைக்கலாம்.'],
    repeat: `இந்த இடத்திற்கு அருகில் ${details.count || 2} ஒத்த டெமோ பதிவுகள் உள்ளன. சேமிப்பதற்கு முன் அவற்றைச் சரிபார்க்கவும். இது மாநகராட்சிக்கு அனுப்பப்படாது.`
  };
  const te = {
    askComplaint: ['ఏ సమస్య ఎదురైంది? చెప్పండి.', 'మీరు ఏ సమస్యను నమోదు చేయాలనుకుంటున్నారు? వివరించండి.', 'సరే, ఏమి జరిగిందో మీ మాటల్లో చెప్పండి.'],
    askCategory: ['సరే, ఇంకొంచెం వివరంగా చెబుతారా?', 'అర్థం చేసుకోవడానికి ఒక చిన్న వివరాన్ని చెప్పండి.', 'ఈ సమస్య ఎలా ఉందో కొంచెం వివరించండి.'],
    askLocation: ['ఈ సమస్య ఏ వీధి లేదా ప్రాంతంలో ఉంది? దగ్గరలోని గుర్తు కూడా చెప్పండి.', 'మ్యాప్‌లో సరైన ప్రదేశాన్ని గుర్తించడానికి వీధి పేరు లేదా దగ్గరలోని ల్యాండ్‌మార్క్ చెప్పండి.', 'ఏ ప్రాంతం ఇది? దగ్గరలోని దుకాణం, పాఠశాల లేదా వీధి పేరు చెప్పగలరా?'],
    askPin: ['మ్యాప్‌లో ఒక ప్రదేశాన్ని గుర్తించాను. పిన్ సరైన చోటుందో చూసి నిర్ధారించండి.', 'ఈ ప్రదేశం సరైనదిగా కనిపిస్తోంది. మ్యాప్ పిన్‌ను పరిశీలించి నిర్ధారిస్తారా?', 'మీ ఫిర్యాదు ప్రదేశం ఇదేనా? మ్యాప్‌లో పిన్‌ను నిర్ధారించండి.'],
    askDuration: ['ఈ సమస్య ఎన్ని రోజులుగా ఉంది?', 'ఇది ఎప్పటి నుంచి జరుగుతోంది? ఎన్ని రోజులు అయ్యాయి?', 'ఈ సమస్య ఎంతకాలంగా ఉంది? రోజులు లేదా వారాలుగా చెప్పండి.'],
    askDurationUnit: ['సంఖ్య అర్థమైంది. అది రోజులు, వారాలు లేదా నెలలా?', 'మీరు చెప్పిన సంఖ్య ఏ కాలానికి సంబంధించినది — రోజులు, వారాలు, నెలలా?'],
    askConfirm: [d => `సరే, ${d.category || 'సమస్య'} ఫిర్యాదు. స్థలం: ${d.address || 'స్థలం నిర్ధారించలేదు'}. వ్యవధి: ${d.durationText || 'చెప్పలేదు'}. నమోదు చేయనా?`, d => `వివరాలు ఇవి: ${d.category || 'సమస్య'}, ${d.address || 'స్థలం ఎంచుకోలేదు'}, ${d.durationText || 'వ్యవధి చెప్పలేదు'}. సరైనవైతే సేవ్ చేయనా?`, d => `${d.category || 'సమస్య'} కోసం ఫిర్యాదు సిద్ధంగా ఉంది. స్థలం ${d.address || 'నిర్ధారించలేదు'}, వ్యవధి ${d.durationText || 'తెలియదు'}. నిర్ధారిస్తారా?`],
    saved: 'మీ ఫిర్యాదు CivicVoice‌లో నమోదు అయింది.',
    retry: ['క్షమించండి, ఆ వివరాన్ని స్పష్టంగా అర్థం చేసుకోలేకపోయాను. మళ్లీ చెబుతారా?', 'కొన్ని మాటలు స్పష్టంగా వినిపించలేదు. కొంచెం నెమ్మదిగా చెప్పండి.', 'మీ సమాధానం పూర్తిగా అర్థం కాలేదు. మరోసారి ప్రయత్నిద్దాం.'],
    locationNotFound: ['ఆ ప్రదేశాన్ని ఖచ్చితంగా కనుగొనలేకపోయాను. దగ్గరలోని గుర్తు చెప్పండి లేదా మ్యాప్‌లో పిన్ పెట్టండి.', 'చిరునామా సరిపోలలేదు. వీధి పేరు, ప్రాంతం లేదా దగ్గరలోని ల్యాండ్‌మార్క్ చెప్పండి.'],
    repeat: `ఈ ప్రదేశానికి దగ్గరలో ${details.count || 2} ఇలాంటి డెమో రికార్డులు ఉన్నాయి. సేవ్ చేసే ముందు వాటిని పరిశీలించండి. ఇది మున్సిపాలిటీకి పంపబడదు.`
  };
  const hi = {
    askComplaint: ['क्या समस्या हुई है? बताइए।', 'आप आज कौन-सी समस्या दर्ज करना चाहते हैं?', 'ठीक है, क्या हुआ? अपने शब्दों में बताइए।'],
    askCategory: ['समस्या को समझने के लिए थोड़ा और विवरण बताइए।', 'आप जो देख रहे हैं उसके बारे में थोड़ा और बताइए।', 'सही श्रेणी चुनने के लिए एक छोटा सा विवरण मदद करेगा।'],
    askLocation: ['यह समस्या किस सड़क या इलाके में है? पास की कोई पहचान भी बताएं।', 'सही जगह मैप पर लगाने के लिए सड़क, मोहल्ला या पास का लैंडमार्क बताएं।', 'यह कहाँ हो रहा है? सड़क का नाम या पास की दुकान/स्कूल बताएं।'],
    askPin: ['मुझे एक संभावित जगह मिली है। कृपया मैप पर पिन देखकर पुष्टि करें।', 'क्या मैप पर दिखाई गई जगह सही है?', 'आगे बढ़ने से पहले कृपया मैप पिन की पुष्टि करें।'],
    askDuration: ['यह समस्या कब से हो रही है?', 'आपने यह समस्या पहली बार कब देखी?', 'यह कितने दिनों या हफ्तों से चल रही है?'],
    askDurationUnit: ['संख्या समझ गया। यह दिन, हफ्ते या महीने हैं?', 'आपका मतलब दिन, हफ्ते या महीने से है?'],
    askConfirm: [d => `आपकी ${d.category || 'नागरिक समस्या'} की शिकायत ${d.address || 'पुष्टि न हुई जगह'} के लिए है और यह ${d.durationText || 'अनिश्चित अवधि'} से है। क्या इसे सेव करूँ?`, d => `कृपया जाँचें: ${d.category || 'समस्या'} · ${d.address || 'जगह नहीं चुनी'} · ${d.durationText || 'अवधि नहीं दी गई'}. क्या सब सही है?`, d => `आपकी शिकायत तैयार है: ${d.category || 'समस्या'}, ${d.durationText || 'अवधि अज्ञात'}, ${d.address || 'जगह की पुष्टि नहीं हुई'}. क्या इसे सेव करूँ?`],
    saved: 'आपकी शिकायत CivicVoice में दर्ज हो गई है।',
    retry: ['माफ़ कीजिए, मैं वह हिस्सा ठीक से नहीं समझ पाया। एक बार फिर बताइए।', 'कुछ शब्द साफ़ नहीं सुनाई दिए। थोड़ा धीरे बोलकर दोबारा बताएं।', 'मैं यह सही दर्ज करना चाहता हूँ। कृपया वह जानकारी दोबारा बताएं।'],
    locationNotFound: ['मुझे वह जगह ठीक से नहीं मिली। पास का लैंडमार्क बताएं या मैप पर पिन चुनें।', 'पता मैच नहीं हुआ। सड़क या इलाके का नाम बताएं, या मैप पर जगह चुनें।'],
    repeat: `पास में ${details.count || 2} मिलते-जुलते डेमो रिकॉर्ड मिले। सेव करने से पहले उनकी जाँच करें। यह रिपोर्ट नगरपालिका को नहीं भेजी जाती है।`
  };
  const kn = {
    askComplaint: ['ಯಾವ ಸಮಸ್ಯೆ ಸಂಭವಿಸಿದೆ? ಹೇಳಿ.', 'ಇಂದು ಯಾವ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?', 'ಸರಿ, ಏನಾಯಿತು? ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ.'],
    askCategory: ['ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಇನ್ನಷ್ಟು ವಿವರ ಹೇಳಿ.', 'ನೀವು ನೋಡುತ್ತಿರುವ ಸಮಸ್ಯೆಯ ಬಗ್ಗೆ ಸ್ವಲ್ಪ ಇನ್ನಷ್ಟು ಹೇಳಿ.', 'ಸರಿಯಾದ ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ಒಂದು ಚಿಕ್ಕ ವಿವರ ಸಹಾಯ ಮಾಡುತ್ತದೆ.'],
    askLocation: ['ಈ ಸಮಸ್ಯೆ ಯಾವ ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿದೆ? ಹತ್ತಿರದ ಗುರುತನ್ನೂ ಹೇಳಿ.', 'ಸರಿಯಾದ ಸ್ಥಳವನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ಗುರುತಿಸಲು ರಸ್ತೆ, ಪ್ರದೇಶ ಅಥವಾ ಹತ್ತಿರದ ಸ್ಥಳದ ಹೆಸರು ಹೇಳಿ.', 'ಇದು ಎಲ್ಲಿದೆ? ರಸ್ತೆ ಹೆಸರು ಅಥವಾ ಹತ್ತಿರದ ಅಂಗಡಿ/ಶಾಲೆಯನ್ನು ಹೇಳಬಹುದು.'],
    askPin: ['ಸಂಭಾವ್ಯ ಸ್ಥಳವನ್ನು ಕಂಡುಹಿಡಿದಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ನಕ್ಷೆಯ ಪಿನ್ ಸರಿಯಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿ.', 'ನಕ್ಷೆಯಲ್ಲಿ ತೋರಿಸಿರುವ ಸ್ಥಳ ಸರಿಯೇ?', 'ಮುಂದುವರಿಯುವ ಮೊದಲು ನಕ್ಷೆಯ ಪಿನ್ ಅನ್ನು ಪರಿಶೀಲಿಸಿ.'],
    askDuration: ['ಈ ಸಮಸ್ಯೆ ಎಷ್ಟು ದಿನಗಳಿಂದ ಇದೆ?', 'ಈ ಸಮಸ್ಯೆಯನ್ನು ಮೊದಲ ಬಾರಿ ಯಾವಾಗ ಗಮನಿಸಿದ್ದೀರಿ?', 'ಇದು ಎಷ್ಟು ದಿನಗಳು ಅಥವಾ ವಾರಗಳಿಂದ ನಡೆಯುತ್ತಿದೆ?'],
    askDurationUnit: ['ಸಂಖ್ಯೆ ಅರ್ಥವಾಯಿತು. ಅದು ದಿನಗಳು, ವಾರಗಳು ಅಥವಾ ತಿಂಗಳುಗಳಾ?', 'ನೀವು ಹೇಳಿದ್ದು ದಿನಗಳು, ವಾರಗಳು ಅಥವಾ ತಿಂಗಳುಗಳೇ?'],
    askConfirm: [d => `ನಿಮ್ಮ ${d.category || 'ನಾಗರಿಕ ಸಮಸ್ಯೆ'} ದೂರು ${d.address || 'ದೃಢೀಕರಿಸದ ಸ್ಥಳ'}ಕ್ಕೆ ಸಂಬಂಧಿಸಿದೆ ಮತ್ತು ${d.durationText || 'ಅವಧಿ ತಿಳಿದಿಲ್ಲ'}. ಇದನ್ನು ಉಳಿಸಬೇಕೇ?`, d => `ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ: ${d.category || 'ಸಮಸ್ಯೆ'} · ${d.address || 'ಸ್ಥಳ ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ'} · ${d.durationText || 'ಅವಧಿ ನೀಡಿಲ್ಲ'}. ಎಲ್ಲವೂ ಸರಿಯೇ?`, d => `ನಿಮ್ಮ ದೂರು ಸಿದ್ಧವಾಗಿದೆ: ${d.category || 'ಸಮಸ್ಯೆ'}, ${d.durationText || 'ಅವಧಿ ತಿಳಿದಿಲ್ಲ'}, ${d.address || 'ಸ್ಥಳ ದೃಢೀಕರಿಸಿಲ್ಲ'}. ಉಳಿಸಬೇಕೇ?`],
    saved: 'ನಿಮ್ಮ ದೂರು CivicVoice ನಲ್ಲಿ ದಾಖಲಾಗಿದೆ.',
    retry: ['ಕ್ಷಮಿಸಿ, ಆ ವಿವರ ಸ್ಪಷ್ಟವಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಹೇಳುತ್ತೀರಾ?', 'ಕೆಲವು ಪದಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಹೇಳಿ.', 'ನಾನು ಇದನ್ನು ಸರಿಯಾಗಿ ದಾಖಲಿಸಲು ಬಯಸುತ್ತೇನೆ. ಆ ವಿವರವನ್ನು ಮತ್ತೆ ಹೇಳಿ.'],
    locationNotFound: ['ಆ ಸ್ಥಳವನ್ನು ನಿಖರವಾಗಿ ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ. ಹತ್ತಿರದ ಗುರುತು ಹೇಳಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಪಿನ್ ಆಯ್ಕೆ ಮಾಡಿ.', 'ವಿಳಾಸ ಹೊಂದಿಕೆಯಾಗಲಿಲ್ಲ. ರಸ್ತೆ ಅಥವಾ ಪ್ರದೇಶದ ಹೆಸರು ಹೇಳಿ, ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ಆಯ್ಕೆ ಮಾಡಿ.'],
    repeat: `ಈ ಸ್ಥಳದ ಹತ್ತಿರ ${details.count || 2} ಹೋಲುವ ಡೆಮೋ ದಾಖಲೆಗಳಿವೆ. ಉಳಿಸುವ ಮೊದಲು ಅವುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಈ ವರದಿಯನ್ನು ನಗರಪಾಲಿಕೆಗೆ ಕಳುಹಿಸಲಾಗುವುದಿಲ್ಲ.`
  };
  const en = {
    askComplaint: ['What problem are you experiencing? Tell me in your own words.', 'What would you like to report today?', 'I’m ready to help. What happened?'],
    askCategory: ['Could you add one more detail so I can understand the issue?', 'Tell me a little more about what you are seeing.', 'A little more context will help me classify this correctly.'],
    askLocation: ['Which street or area is affected? A nearby landmark helps me place it on the map.', 'Please share the street, neighbourhood, or a nearby landmark so we can pin the right spot.', 'Where is this happening? A road name or nearby shop/school is helpful.'],
    askPin: ['I found a possible place. Please check the map pin and confirm it is correct.', 'The map is showing a likely match. Is this the right location?', 'Please verify the pin on the map before we continue.'],
    askDuration: ['How long has this been happening?', 'When did you first notice this issue?', 'Has this been going on for days or weeks?'],
    askDurationUnit: ['I caught the number. Is that days, weeks, or months?', 'Which unit did you mean — days, weeks, or months?'],
    askConfirm: [d => `I have a ${d.category || 'civic issue'} report for ${d.address || 'an unconfirmed location'}, ongoing for ${d.durationText || 'an unspecified period'}. Should I save it?`, d => `Please check these details: ${d.category || 'civic issue'} · ${d.address || 'location not selected'} · ${d.durationText || 'duration not provided'}. Are they correct?`, d => `Your report is ready to review: ${d.category || 'civic issue'}, ${d.durationText || 'duration unknown'}, at ${d.address || 'location not confirmed'}. Shall I save it?`],
    saved: 'Your complaint has been recorded in CivicVoice.',
    retry: ['Sorry, I missed part of that. Could you say it once more?', 'I did not catch those words clearly. Please try a little more slowly.', 'I want to get this right. Could you repeat that detail?'],
    locationNotFound: ['I could not find that exact place. Try a nearby landmark or select a pin on the map.', 'That address did not match. Share the road or neighbourhood name, or choose the location on the map.'],
    repeat: `I found ${details.count || 2} similar records in the demo dataset. Please review them before saving. This report is not sent to a municipal office.`
  };
  const taLatn = {
    askComplaint: ['Enna prachanai nadakkudhu? Ungaloda vaarthaigal-la sollunga.', 'Innaikku endha prachanai report pannanum?', 'Seri, enna nadandhuchu-nu sollunga.'],
    askCategory: ['Konjam innum detail solla mudiyuma?', 'Neenga enna paakureenga-nu konjam vivaramaa sollunga.'],
    askLocation: ['Indha prachanai endha street illa area-la irukku? Pakkathula irukkura landmark sollunga.', 'Map-la sariyana idatha mark panna street name illa nearby landmark sollunga.'],
    askPin: ['Map-la irukkura pin sariyana idathula irukka-nu check panni confirm pannunga.'],
    askDuration: ['Indha prachanai ethana naala irukku?', 'Idha eppo first notice panneenga?'],
    askDurationUnit: ['Idhu days, weeks, illa months-aa?'],
    askConfirm: [d => `${d.category || 'Civic issue'} report ${d.address || 'location not confirmed'}-la, ${d.durationText || 'duration not given'}-a irukku. Demo-la save pannattuma?`],
    saved: 'Unga report CivicVoice demo-la save aagiyirukku.',
    retry: ['Andha detail puriyala. Innoru murai sollunga.'],
    locationNotFound: ['Andha idatha kandupidikka mudiyala. Nearby landmark sollunga illa map-la pin select pannunga.'],
    repeat: `Indha location pakkathula ${details.count || 2} similar demo reports irukku. Save panna munnaadi check pannunga. Idhu municipal office-ku anuppapadadhu.`
  };
  const teLatn = {
    askComplaint: ['Emi problem jarugutondi? Mee maatallo cheppandi.', 'Ee roju ye problem report cheyali?', 'Sare, emi jarigindo cheppandi.'],
    askCategory: ['Konchem inka detail cheppagalara?', 'Meeru gamaninchina vishayam gurinchi konchem vivaranga cheppandi.'],
    askLocation: ['Ee problem ye street leda area-lo undi? Daggaralo unna landmark cheppandi.', 'Map-lo correct place mark cheyadaniki street name leda landmark cheppandi.'],
    askPin: ['Map-lo pin correct place-lo undho check chesi confirm cheyyandi.'],
    askDuration: ['Ee problem enni rojula nunchi undi?', 'Ee issue-ni modatisari eppudu gamaninchaaru?'],
    askDurationUnit: ['Idi days, weeks, leka months-aa?'],
    askConfirm: [d => `${d.category || 'Civic issue'} report ${d.address || 'location confirm kaaledu'} daggara, ${d.durationText || 'duration cheppaledu'} nunchi undi. Demo-lo save cheyyana?`],
    saved: 'Mee report CivicVoice demo-lo save ayyindi.',
    retry: ['Aa detail clear-ga artham kaaledu. Malli cheppandi.'],
    locationNotFound: ['Aa place dorakaledu. Nearby landmark cheppandi leda map-lo pin select cheyyandi.'],
    repeat: `Ee place daggara ${details.count || 2} similar demo reports unnayi. Save chese mundu review cheyyandi. Idi municipal office-ku pampabadadu.`
  };
  const hiLatn = {
    askComplaint: ['Kya problem ho rahi hai? Apne words mein bataiye.', 'Aaj kaunsi problem report karna chahte hain?', 'Theek hai, kya hua? Bataiye.'],
    askCategory: ['Problem samajhne ke liye thoda aur detail bataiye.', 'Aap kya dekh rahe hain, thoda aur bata sakte hain?'],
    askLocation: ['Ye problem kis street ya area mein hai? Paas ka landmark bhi bataiye.', 'Map par sahi jagah mark karne ke liye road ya nearby landmark bataiye.'],
    askPin: ['Map par pin sahi jagah par hai? Check karke confirm karein.'],
    askDuration: ['Ye problem kitne din se hai?', 'Aapne ise pehli baar kab dekha?'],
    askDurationUnit: ['Ye days, weeks, ya months hain?'],
    askConfirm: [d => `${d.category || 'Civic issue'} ki report ${d.address || 'unconfirmed location'} ke liye hai aur ${d.durationText || 'duration nahi di gayi'} se hai. Kya ise demo mein save karun?`],
    saved: 'Aapki report CivicVoice demo mein save ho gayi.',
    retry: ['Maaf kijiye, detail clear nahi hui. Ek baar phir bataiye.'],
    locationNotFound: ['Woh jagah nahi mili. Paas ka landmark bataiye ya map par pin chuniye.'],
    repeat: `Paas mein ${details.count || 2} similar demo reports hain. Save karne se pehle unhe check kar lein. Yeh municipal office ko nahi bheja jayega.`
  };
  const base = lang === 'ta-Latn' ? taLatn : lang === 'te-Latn' ? teLatn : lang === 'hi-Latn' ? hiLatn : lang.startsWith('ta') ? ta : lang.startsWith('te') ? te : lang.startsWith('hi') ? hi : lang.startsWith('kn') ? kn : en;
  let raw = base[key] ?? en[key] ?? 'Please say that again.';
  if (typeof raw === 'function') raw = raw(details);
  const variants = (Array.isArray(raw) ? raw : [raw]).map(item => typeof item === 'function' ? item(details) : item);
  if (variants.length < 2) return variants[0];
  const historyKey = `${lang}:${key}`;
  const previous = localeCopyHistory.get(historyKey);
  const options = variants.filter(item => item !== previous);
  const selected = (options.length ? options : variants)[Math.floor(Math.random() * (options.length || variants.length))];
  localeCopyHistory.set(historyKey, selected);
  return selected;
}
function nextStageFor(draft) {
  if (!draft.category) return 'complaint';
  if (!draft.address || draft.lat == null || draft.lng == null || !Number.isFinite(Number(draft.lat)) || !Number.isFinite(Number(draft.lng)) || !draft.locationConfirmed) return 'location';
  if (!draft.durationText) return 'duration';
  return 'confirm';
}

app.get('/api/health', (_req, res) => res.json({
  ok: true, apiKeyConfigured: Boolean(API_KEY), sttEndpoint: STT_URL, ttsEndpoint: TTS_URL,
  tts: { model: TTS_MODEL, speed: TTS_SPEED, bitrate: TTS_BITRATE, sampleRate: TTS_SAMPLE_RATE, voices: { tamil: TTS_VOICE_TA, telugu: TTS_VOICE_TE, hindi: TTS_VOICE_HI, hinglish: TTS_VOICE_HINGLISH, kannada: TTS_VOICE_KN, english: TTS_VOICE_EN } },
  database: 'sqlite', workflow: 'civic-complaint'
}));

app.get('/api/complaints', (_req, res) => {
  res.json({ complaints: allComplaints.all().map(publicComplaint) });
});
app.get('/api/stats', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM complaints').get().n;
  const recurring = db.prepare('SELECT COUNT(*) AS n FROM complaints WHERE recurring_flag = 1').get().n;
  const inProgress = db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE status = 'In progress'").get().n;
  const resolved = db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE status = 'Resolved'").get().n;
  res.json({ total, recurring, inProgress, resolved });
});



app.post('/api/stt', upload.single('audio'), async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'Gnani API key is missing. Add GNANI_API_KEY to server/.env, then restart the server.' });
  if (!req.file) return res.status(400).json({ error: 'No audio file received. Record a short voice turn and try again.' });
  // CivicVoice uses the user's selected language only. Do not auto-detect by
  // transcribing the same clip into several languages and choosing a guessed result.
  const requested = String(req.body.language || 'ta-IN');
  const allowedLanguages = new Set(['ta-IN', 'te-IN', 'hi-IN', 'kn-IN', 'en-IN']);
  const selectedSttLanguage = allowedLanguages.has(requested) ? requested : 'ta-IN';
  const tempDir = await mkdtemp(path.join(tmpdir(), 'civicvoice-'));
  const ext = req.file.mimetype.includes('ogg') ? '.ogg' : req.file.mimetype.includes('mp4') ? '.m4a' : req.file.mimetype.includes('wav') ? '.wav' : '.webm';
  const inputPath = path.join(tempDir, `input${ext}`);
  const outputPath = path.join(tempDir, 'converted.wav');
  try {
    await writeFile(inputPath, req.file.buffer);
    if (!ffmpegPath) throw new Error('FFmpeg was not found. Reinstall server dependencies or upload WAV/MP3 audio through a compatible client.');
    await execFileAsync(ffmpegPath, ['-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath], { timeout: 40_000, maxBuffer: 2 * 1024 * 1024 });
    const wav = await readFile(outputPath);
    const transcribeOne = async languageCode => {
      const form = new FormData();
      form.append('audio_file', new Blob([wav], { type: 'audio/wav' }), 'civicvoice.wav');
      form.append('language_code', languageCode);
      form.append('format', 'transcribe');
      form.append('itn_native_numerals', 'false');
      // Domain vocabulary boost helps with common civic complaint terms.
      form.append('bias_list', JSON.stringify(['streetlight', 'street light', 'water supply', 'water leakage', 'garbage collection', 'pothole', 'drainage', 'blocked drain', 'sewage overflow', 'stormwater flooding', 'power outage', 'traffic signal', 'footpath damage', 'mosquito nuisance', 'fallen tree', 'public toilet', 'complaint', 'Nagar', 'Chennai', 'Anna Nagar', 'theru vilakku', 'vilakku', 'kuppai', 'veedhi', 'neellu', 'thanni', 'sakkadai', 'kuzhi', 'டிரைனேஜ்', 'சாக்கடை', 'பிளாக்', 'தண்ணீர் வரவில்லை', 'கொசு தொல்லை', 'குழாய் கசிவு', 'தண்ணீர் கசிவு', 'பெரிய பள்ளம்', 'மழைநீர் தேக்கம்', 'డ్రైనేజ్', 'డ్రైనేజీ', 'డ్రెయినేజ్', 'డ్రైన్', 'డ్రైనేజ్ ప్రాబ్లం', 'డ్రైనేజీ సమస్య', 'మురుగునీరు', 'కాలువ', 'పైపు లీక్', 'నీటి పైపులైన్', 'పెద్ద గుంత', 'వర్షపు నీరు', 'వీధి దీపం', 'చెత్త', 'पाइपलाइन', 'पानी की पाइप लाइन', 'पानी का रिसाव', 'पानी लीक', 'गड्ढा', 'सड़क पर गड्ढा', 'बारिश का पानी', 'जलभराव', 'नाली जाम', 'नाली बंद', 'कूड़ा', 'कचरा', 'स्ट्रीट लाइट', 'ಗುಂಡಿ', 'ದೊಡ್ಡ ಗುಂಡಿ', 'ನೀರಿನ ಪೈಪ್ ಲೈನ್', 'ನೀರು ಸೋರಿಕೆ', 'ಚರಂಡಿ ಮುಚ್ಚಿದೆ', 'ಮಳೆ ನೀರು', 'ಬೀದಿ ದೀಪ', 'ಕಸ']));
      form.append('bias_score', '1.0');
      const upstream = await fetch(STT_URL, { method: 'POST', headers: { 'X-API-Key-ID': API_KEY }, body: form, signal: AbortSignal.timeout(45_000) });
      const raw = await upstream.text();
      let body;
      try { body = JSON.parse(raw); } catch { body = { raw }; }
      if (!upstream.ok) throw new Error(body?.error?.message || body?.detail || body?.message || `Gnani STT request failed (${upstream.status}) for ${languageCode}.`);
      const transcript = body?.transcript || body?.text || body?.data?.transcript || '';
      if (!String(transcript).trim()) throw new Error(`Gnani returned no transcript for ${languageCode}.`);
      const cleanedTranscript = String(transcript).trim();
      return { transcript: cleanedTranscript, language: languageCode, requestId: body.request_id || body.requestId || null };
    };
    const result = await transcribeOne(selectedSttLanguage);
    res.json({
      transcript: result.transcript,
      requestId: result.requestId,
      language: selectedSttLanguage,
      languageMode: 'selected'
    });
  } catch (error) {
    console.error('STT processing error:', error.message);
    res.status(502).json({ error: error.name === 'TimeoutError' ? 'Speech recognition timed out. Please try a shorter recording or choose a fixed language.' : `Could not process audio: ${error.message}` });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});
const ttsCache = new Map();
const TTS_CACHE_LIMIT = 100;
function sendCachedTts(res, cacheKey, cached) {
  // Refresh insertion order for a small LRU cache.
  ttsCache.delete(cacheKey); ttsCache.set(cacheKey, cached);
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600', 'X-CivicVoice-TTS-Cache': 'HIT' });
  res.send(cached);
}
app.post('/api/tts', async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'Gnani API key is missing. Add GNANI_API_KEY to server/.env, then restart the server.' });
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Text is required for speech synthesis.' });
  if (text.length > 1200) return res.status(400).json({ error: 'Please synthesize shorter text segments (maximum 1,200 characters).' });
  const language = ['ta-IN', 'te-IN', 'hi-IN', 'kn-IN', 'en-IN'].includes(req.body?.language) ? req.body.language : 'ta-IN';
  const voiceByLanguage = {
    'ta-IN': TTS_VOICE_TA,
    'te-IN': TTS_VOICE_TE,
    'hi-IN': TTS_VOICE_HI,
    'hi-Latn': TTS_VOICE_HINGLISH,
    'kn-IN': TTS_VOICE_KN,
    'en-IN': TTS_VOICE_EN
  };
  // The API receives hi-IN for Hinglish text, but uses the dedicated Hinglish voice when selected in the UI.
  const voiceProfile = req.body?.voiceProfile === 'hi-Latn' && language === 'hi-IN' ? 'hi-Latn' : language;
  const voice = voiceByLanguage[voiceProfile] || voiceByLanguage[language];
  const cacheKey = `${TTS_MODEL}|${language}|${voice}|${TTS_SPEED}|${text}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) return sendCachedTts(res, cacheKey, cached);
  try {
    const upstream = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'X-API-Key-ID': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, model: TTS_MODEL, language, ...(voice ? { voice } : {}), speed: TTS_SPEED,
        // MP3 supports only 32k, 64k, 96k, 128k, or 192k. Do not send the PCM encoding flag for MP3.
        audio_config: { sample_rate: TTS_SAMPLE_RATE, bitrate: TTS_BITRATE, container: 'mp3' }
      }),
      signal: AbortSignal.timeout(45_000)
    });
    if (!upstream.ok) {
      const message = (await upstream.text()).slice(0, 700);
      console.error('Gnani TTS error:', upstream.status, message);
      return res.status(upstream.status).json({ error: `Gnani TTS failed (${upstream.status}): ${message || 'Check the selected model, voice, language and audio settings.'}` });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) return res.status(502).json({ error: 'Gnani returned empty audio.' });
    ttsCache.set(cacheKey, audio);
    if (ttsCache.size > TTS_CACHE_LIMIT) ttsCache.delete(ttsCache.keys().next().value);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': String(audio.length), 'Cache-Control': 'private, max-age=3600', 'X-CivicVoice-TTS-Cache': 'MISS' });
    res.send(audio);
  } catch (error) {
    console.error('TTS request error:', error.message);
    res.status(502).json({ error: error.name === 'TimeoutError' ? 'Speech synthesis timed out. Please retry.' : 'Could not reach Gnani TTS. Check the network and configured endpoint.' });
  }
});
// One place/address lookup at a time; results are cached to respect public Nominatim limits.
const geocodeCache = new Map();
let lastGeocodeAt = 0;
app.get('/api/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 3) return res.status(400).json({ error: 'Enter at least three characters for a location search.' });
  if (query.length > 180) return res.status(400).json({ error: 'Location search is too long.' });
  const preset = findPresetLocation(query);
  if (preset) return res.json({ results: [{ displayName: preset.displayName, lat: preset.lat, lng: preset.lng }], cached: true, source: 'location-catalog' });
  const cacheKey = query.toLowerCase();
  if (geocodeCache.has(cacheKey)) return res.json({ results: geocodeCache.get(cacheKey), cached: true });
  try {
    const wait = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastGeocodeAt = Date.now();
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');
    const userAgent = `CivicVoiceAI/1.0${GEOCODING_CONTACT ? ` (${GEOCODING_CONTACT})` : ''}`;
    const response = await fetch(url, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return res.status(502).json({ error: 'The map search provider is temporarily unavailable. You can still choose a pin manually.' });
    const body = await response.json();
    const results = body.map(place => ({ displayName: place.display_name, lat: Number(place.lat), lng: Number(place.lon) }));
    geocodeCache.set(cacheKey, results);
    res.json({ results, cached: false });
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(502).json({ error: 'Could not search that address right now. Move the map and select the location manually.' });
  }
});

function localizedStagePrompt(stage, draft, language) {
  if (stage === 'complaint') return localeCopy(language, 'askComplaint', draft);
  if (stage === 'location') return localeCopy(language, 'askLocation', draft);
  if (stage === 'location_confirm') return localeCopy(language, 'askPin', draft);
  if (stage === 'duration') return localeCopy(language, 'askDuration', draft);
  return localeCopy(language, 'askConfirm', draft);
}

function appendDistinctDescription(existing, incoming) {
  const oldText = String(existing || '').trim();
  const newText = String(incoming || '').trim();
  if (!oldText) return newText.slice(0, 900);
  if (!newText) return oldText.slice(0, 900);
  const norm = value => value.toLowerCase().replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(oldText), b = norm(newText);
  if (a === b || a.includes(b) || b.includes(a)) return (b.length > a.length ? newText : oldText).slice(0, 900);
  return `${oldText} ${newText}`.slice(0, 900);
}
app.post('/api/conversation/turn', (req, res) => {
  const transcript = String(req.body?.transcript || '').trim();
  const stage = String(req.body?.stage || 'complaint');
  const language = String(req.body?.language || 'ta-IN');
  const draft = { ...(req.body?.draft || {}) };
  const originalDraft = { ...draft };
  if (!transcript) return res.status(400).json({ error: 'Transcript is required.' });
  if (transcript.length > 1600) return res.status(400).json({ error: 'That turn is too long. Please split it into shorter statements.' });

  let response = '';
  let nextStage = stage;
  let action = null;
  let selectedLocation = null;
  const cancelRequested = /\bcancel\b|\bdiscard\b|\bstop this complaint\b|ரத்து|விட்டுவிடு|ரத்து செய்|రద్దు|వద్దు/i.test(transcript);
  const currentLocationRequested = /use my location|current location|my location|device location|near me|என் இருப்பிடம்|எனது இடம்|నా లొకేషన్|ప్రస్తుత స్థానం|నా దగ్గర/i.test(transcript);
  const lower = transcript.toLowerCase();

  // Extract every fact from every turn. The current stage supplies context, but never blocks other facts.
  const classification = classifyComplaint(transcript);
  const foundCategory = classification.category;
  if (foundCategory) draft.category = foundCategory;
  let duration = parseDuration(transcript);
  if (!duration && stage === 'duration' && draft.pendingDurationNumber != null && isDurationUnitOnly(transcript)) {
    duration = parseDurationUnitOnly(transcript, draft.pendingDurationNumber);
  }
  const bareNumber = parseBareNumber(transcript);
  const isUnitOnly = isDurationUnitOnly(transcript);
  if (duration) {
    draft.durationText = duration.text;
    draft.durationDays = duration.days;
    delete draft.pendingDurationNumber;
  } else if (stage === 'duration' && bareNumber != null && !isUnitOnly) {
    draft.pendingDurationNumber = bareNumber;
  }

  // Only update safety from an explicit safety answer or a clear hazard phrase.
  const explicitSafetyPhrase = /danger|risk|unsafe|safe|dark|dangerous|இருட்டு|இருட்டாக|ஆபத்து|பாதுகாப்பு|பயம்|இல்லை|பரவாயில்லை|ప్రమాదం|చీకటి|సురక్షితం/i.test(transcript);
  const parsedSafety = parseSafety(transcript);
  if (explicitSafetyPhrase && parsedSafety !== null) draft.safetyRisk = parsedSafety;
  else if (/dark|unsafe|danger|risk|exposed wire|electric shock|accident|இருட்டு|இருட்டாக|ஆபத்து|பயம்|மின்கம்பி|ప్రమాదం|చీకటి|వైర్ బయట/i.test(transcript)) draft.safetyRisk = true;
  if (draft.safetyRisk === true) draft.urgency = 'priority review';

  const knownLocation = findPresetLocation(transcript);
  let narrativeLocation = knownLocation?.displayName || extractLocationFromNarrative(transcript, findPresetLocation);
  const descriptionCorrection = transcript.match(/(?:change|correct|update|edit)\s+(?:the\s+)?(?:complaint\s+)?description\s+(?:to|as|:)?\s*(.+)$/i)
    || transcript.match(/(?:விவரத்தை மாற்று|விவரங்களை மாற்று|వివరాలు మార్చండి)\s*[:：]?\s*(.+)$/i);
  if (descriptionCorrection?.[1] && stage === 'confirm') draft.description = descriptionCorrection[1].trim().slice(0, 900);

  // Don't keep appending the same issue when the citizen repeats it to add an address.
  if (stage === 'complaint') {
    if (!draft.description) {
      draft.description = transcript.slice(0, 900);
    } else if (foundCategory && !originalDraft.category) {
      // A follow-up may finally reveal the issue category. Keep the original
      // description instead of replacing it with only the repeated category word.
      draft.description = appendDistinctDescription(originalDraft.description, transcript);
    } else if (!foundCategory && !knownLocation && !duration) {
      draft.description = appendDistinctDescription(draft.description, transcript);
    }
  }

  // Known catalogue phrases snap straight to a real map point; other spoken addresses are geocoded.
  if (knownLocation) {
    draft.address = knownLocation.displayName;
    draft.lat = knownLocation.lat;
    draft.lng = knownLocation.lng;
    draft.locationConfirmed = false;
    selectedLocation = publicPresetLocation(knownLocation);
    action = 'select_location';
    nextStage = 'location_confirm';
    response = localeCopy(language, 'askPin', draft);
  } else if (narrativeLocation && stage !== 'location_confirm') {
    draft.address = narrativeLocation;
    draft.locationConfirmed = false;
    delete draft.lat;
    delete draft.lng;
    action = 'geocode_location';
    nextStage = 'location_confirm';
    response = localeCopy(language, 'askPin', draft);
  }

  const categoryChanged = Boolean(foundCategory && foundCategory !== originalDraft.category);
  const durationChanged = Boolean(duration && (duration.text !== originalDraft.durationText || duration.days !== originalDraft.durationDays));
  const safetyChanged = draft.safetyRisk !== originalDraft.safetyRisk;
  const descriptionChanged = Boolean(descriptionCorrection?.[1] && stage === 'confirm');

  if (cancelRequested && (draft.category || draft.description || stage !== 'complaint')) {
    response = workflowCopy(language, 'cancelled');
    nextStage = 'complaint'; action = 'cancel'; selectedLocation = null;
  } else if (currentLocationRequested && stage !== 'confirm') {
    response = localeCopy(language, 'locationNotFound'); nextStage = 'location'; action = 'use_location'; selectedLocation = null;
  } else if (selectedLocation || action === 'geocode_location') {
    // Keep the location turn focused on map confirmation. Other captured facts remain in the draft.
  } else if (stage === 'location_confirm') {
    const answer = parseYesNo(transcript);
    if (answer === true) {
      draft.locationConfirmed = true;
      nextStage = nextStageFor(draft);
      response = localizedStagePrompt(nextStage, draft, language);
    } else if (answer === false) {
      draft.locationConfirmed = false;
      delete draft.lat; delete draft.lng;
      nextStage = 'location';
      response = localeCopy(language, 'askLocation', draft);
    } else if (narrativeLocation) {
      // Address correction handled above on the next turn.
      nextStage = 'location'; response = localeCopy(language, 'askLocation', draft);
    } else {
      nextStage = 'location_confirm'; response = localeCopy(language, 'askPin', draft);
    }
  } else if (stage === 'duration' && !duration && bareNumber != null) {
    nextStage = 'duration';
    response = workflowCopy(language, 'durationNumber', { number: bareNumber });
  } else if (stage === 'confirm') {
    const answer = parseYesNo(transcript);
    const fieldCorrection = categoryChanged || durationChanged || safetyChanged || descriptionChanged;
    if (fieldCorrection) {
      nextStage = nextStageFor(draft);
      // If all required fields are present, restate the summary instead of restarting the interview.
      response = nextStage === 'confirm' ? localeCopy(language, 'askConfirm', draft) : localizedStagePrompt(nextStage, draft, language);
    } else if (answer === true) {
      action = 'confirm'; response = 'CONFIRM_READY'; nextStage = 'confirm';
    } else if (answer === false) {
      response = workflowCopy(language, 'confirmNo');
      nextStage = 'confirm'; action = 'show_edit';
    } else {
      response = workflowCopy(language, 'confirmAsk');
      nextStage = 'confirm';
    }
  } else if (stage === 'location') {
    if (currentLocationRequested) {
      response = localeCopy(language, 'locationNotFound'); nextStage = 'location'; action = 'use_location';
    } else if (!narrativeLocation && draft.category && (classification.category === draft.category || classification.predictedCategory === draft.category)) {
      // The citizen repeated the already-known issue instead of giving a location.
      // Stay on the missing-location question; never try to geocode the whole complaint.
      nextStage = 'location';
      const responseClassification = classification.category ? classification : { ...classification, category: draft.category };
      response = conversationalIssueResponse(language, responseClassification, 'location', draft) || localeCopy(language, 'askLocation', draft);
    } else if (classification.category && !narrativeLocation) {
      // A new or clarified issue does not provide a location by itself.
      nextStage = 'location';
      response = conversationalIssueResponse(language, classification, 'location', draft) || localeCopy(language, 'askLocation', draft);
    } else {
      const address = String(narrativeLocation || removeNumericDurationFromLocation(transcript)).trim();
      if (!looksLikePlace(address)) {
        nextStage = 'location'; response = localeCopy(language, 'askLocation', draft);
      } else {
        draft.address = address; draft.locationConfirmed = false; delete draft.lat; delete draft.lng;
        action = 'geocode_location'; nextStage = 'location_confirm'; response = localeCopy(language, 'askPin', draft);
      }
    }
  } else {
    // Ask only for the first missing fact. Never ask about a field that was already extracted.
    nextStage = nextStageFor(draft);
    if (nextStage === 'location' && draft.address && draft.lat != null && draft.lng != null && !draft.locationConfirmed) nextStage = 'location_confirm';
    if (nextStage === 'duration' && draft.pendingDurationNumber != null) {
      response = workflowCopy(language, 'durationNumber', { number: draft.pendingDurationNumber });
    } else if (stage === 'complaint' && nextStage === 'complaint' && draft.description) {
      // The citizen already described the issue once. Ask a focused clarification,
      // not the same open-ended question again.
      response = localeCopy(language, 'askCategory', draft);
    } else {
      response = localizedStagePrompt(nextStage, draft, language);
    }
  }

  if (classification.needsReview && !draft.category && !selectedLocation && action !== 'geocode_location' && action !== 'use_location' && !cancelRequested) {
    const suggestions = classification.candidates.slice(0, 2).map(item => localizedCategorySuggestion(language, item.category)).join(' / ');
    response = workflowCopy(language, 'uncertainCategory', { suggestions: suggestions || 'the issue type' });
    if (nextStage === 'complaint') nextStage = 'complaint';
  }
  if (!cancelRequested && !action && stage === 'complaint' && categoryChanged && classification.category && !classification.needsReview) {
    response = conversationalIssueResponse(language, classification, nextStage, draft) || response;
  }
  const classificationForClient = {
    category: classification.category || null,
    predictedCategory: classification.predictedCategory || null,
    confidence: classification.confidence,
    needsReview: classification.needsReview,
    relatedCategories: classification.relatedCategories || [],
    candidates: classification.candidates.slice(0, 3).map(({ category, evidence }) => ({ category, evidence }))
  };
  res.json({ draft, response, nextStage, action, selectedLocation, locationAddressFromTurn: Boolean(narrativeLocation), classification: classificationForClient });
});
app.post('/api/complaints', (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const validation = validateComplaintSubmission(body, categories.map(item => item.category));
  if (!validation.ok) return res.status(400).json({ error: validation.error });
  const { category, description, address, lat, lng, durationDays, durationText } = validation.value;
  const nearbyOpen = allComplaints.all().filter(row => row.category === category && !/Resolved/i.test(row.status) && haversineMeters(lat, lng, row.lat, row.lng) <= 100);
  const similarCount = nearbyOpen.length + 1;
  const recurring = similarCount >= 2;
  const sequence = Number(db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(id, 4) AS INTEGER)), 0) AS n FROM complaints WHERE id LIKE 'CV-%'").get().n) + 1;
  const id = `CV-${String(sequence).padStart(3, '0')}`;
  const urgency = recurring || body.urgency === 'priority review' || body.safetyRisk === true ? 'priority review' : 'standard';
  const record = {
    id, category, description, duration_text: durationText, duration_days: durationDays,
    address, lat, lng, urgency, department: getDepartment(category),
    recurring_count: similarCount, recurring_flag: recurring ? 1 : 0, created_at: new Date().toISOString()
  };
  insertComplaint.run(record);
  if (recurring) {
    const ids = nearbyOpen.map(row => row.id);
    const transaction = db.transaction(() => {
      updateRecurring.run(similarCount, id);
      const updateExisting = db.prepare('UPDATE complaints SET recurring_count = ?, recurring_flag = 1, urgency = \'priority review\' WHERE id = ?');
      for (const nearbyId of ids) updateExisting.run(similarCount, nearbyId);
    });
    transaction();
  }
  res.status(201).json({ complaint: publicComplaint(getComplaint.get(id)), repeated: recurring, matchingCount: similarCount, resolutionPromise: false });
});

// Demo-only status editing. Production needs authenticated staff roles before this is enabled.
app.patch('/api/complaints/:id/status', (req, res) => {
  const remoteAddress = String(req.socket?.remoteAddress || '');
  const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress);
  if (process.env.NODE_ENV === 'production' || !isLoopback) {
    return res.status(403).json({ error: 'Status editing is available only in the local development demo.' });
  }
  const status = String(req.body?.status || '').trim();
  if (!STATUS_OPTIONS.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUS_OPTIONS.join(', ')}.` });
  }
  const existing = getComplaint.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Complaint ID not found.' });
  db.prepare('UPDATE complaints SET status = ? WHERE id = ?').run(status, req.params.id);
  return res.json({ complaint: publicComplaint(getComplaint.get(req.params.id)), demoOnly: true });
});

app.get('/api/complaints/:id', (req, res) => {
  const row = getComplaint.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Complaint ID not found.' });
  res.json({ complaint: publicComplaint(row) });
});

// In production, serve the built React app and API from the same origin.
// This keeps browser API requests same-origin and avoids exposing a second API host.
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../dist');
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), error => {
      if (error) next(error);
    });
  });
}

app.listen(PORT, HOST, () => {
  console.log(`CivicVoice API server: http://${HOST}:${PORT}`);
  console.log(`Gnani key configured: ${Boolean(API_KEY)} (key value is never printed)`);
  console.log(`Complaint records: ${db.prepare('SELECT COUNT(*) AS n FROM complaints').get().n}`);
});
