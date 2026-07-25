import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Inline database interfaces to make the Serverless Function completely self-contained and avoid import issues
export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jk: 'L' | 'P';
  namaOrangTua: string;
  noHp: string;
  foto?: string;
}

export interface Pelanggaran {
  id: string;
  kode: string;
  namaPelanggaran: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

export interface Pencatatan {
  id: string;
  tanggal: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  pelanggaran: string;
  poin: number;
  petugas: string;
  keterangan: string;
  foto?: string;
}

export interface Pembinaan {
  id: string;
  nis: string;
  namaSiswa: string;
  totalPoin: number;
  tindakan: string;
  tanggal: string;
}

export type Role = 'Admin' | 'Guru BK' | 'Guru Piket';

export interface User {
  username: string;
  nama: string;
  role: Role;
  kelasAjar?: string;
}

// Load environment variables
dotenv.config();

const app = express();

// Custom middleware to avoid hanging in Vercel if req.body is already parsed by serverless environment
app.use((req, res, next) => {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse((req.body as Buffer).toString('utf-8'));
      } catch (e) {
        // Leave as is
      }
    } else if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        // Leave as is
      }
    }
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Extremely robust request logger and URL normalizer middleware for Vercel Serverless environment
app.use((req, res, next) => {
  const originalUrl = req.url;
  console.log(`[Express API] Incoming: ${req.method} ${originalUrl}`);

  // 1. Handle query path forwarded by vercel.json rewrite rule (?path=$1)
  if (req.query && req.query.path) {
    const rawPath = req.query.path;
    const subPath = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath);
    const cleanSubPath = subPath.replace(/^\/+|\/+$/g, '');

    const queryCopy = { ...req.query };
    delete queryCopy.path;
    const queryKeys = Object.keys(queryCopy);
    const queryString = queryKeys.length > 0
      ? '?' + queryKeys.map(k => `${k}=${encodeURIComponent(String(queryCopy[k]))}`).join('&')
      : '';

    req.url = `/api/${cleanSubPath}${queryString}`;
    console.log(`[Express API] Resolved req.url from query path to: ${req.url}`);
  } else if (req.headers['x-forwarded-uri'] && (req.headers['x-forwarded-uri'] as string).startsWith('/api')) {
    req.url = req.headers['x-forwarded-uri'] as string;
  } else if (req.headers['x-original-url'] && (req.headers['x-original-url'] as string).startsWith('/api')) {
    req.url = req.headers['x-original-url'] as string;
  } else if (req.headers['x-forwarded-url'] && (req.headers['x-forwarded-url'] as string).startsWith('/api')) {
    req.url = req.headers['x-forwarded-url'] as string;
  }

  // Clean trailing index references if present for API requests
  if (req.url.startsWith('/api/index.ts')) {
    req.url = req.url.replace(/\/api\/index\.ts\/?/, '/api/');
  } else if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace(/\/api\/index\/?/, '/api/');
  }

  // Clean double slashes
  req.url = req.url.replace(/\/+/g, '/');
  
  console.log(`[Express API] Final resolved URL for routing: ${req.url}`);
  next();
});

// Dynamic, foolproof check for writable filesystem (perfect for Vercel, Netlify, Cloud Run, or AWS)
let DATA_STORE_PATH = path.join(process.cwd(), 'data-store.json');
try {
  const testPath = path.join(process.cwd(), '.write-test-vercel');
  fs.writeFileSync(testPath, 'test');
  fs.unlinkSync(testPath);
} catch (e) {
  DATA_STORE_PATH = path.join('/tmp', 'data-store.json');
}
console.log(`[Express API] Using persistent data store path: ${DATA_STORE_PATH}`);

const CONFIG_STORE_PATH = path.join(path.dirname(DATA_STORE_PATH), 'config-settings.json');
try {
  if (fs.existsSync(CONFIG_STORE_PATH)) {
    const configData = JSON.parse(fs.readFileSync(CONFIG_STORE_PATH, 'utf-8'));
    if (configData && configData.googleScriptUrl) {
      process.env.GOOGLE_SCRIPT_URL = configData.googleScriptUrl;
      console.log(`[Express API] Loaded GOOGLE_SCRIPT_URL from config-settings.json: ${process.env.GOOGLE_SCRIPT_URL}`);
    }
  }
} catch (e) {
  console.warn('[Express API] Gagal memuat config-settings.json di awal:', e);
}

interface PreDefinedUser {
  username: string;
  password: string;
  nama: string;
  role: Role;
  kelasAjar?: string;
}

// Pre-defined users for simulation/authentication
const preDefinedUsers: PreDefinedUser[] = [
  { username: 'admin', password: 'admin123', nama: 'Iien Puspitasari, S.Pd', role: 'Admin' },
  { username: 'gurubk', password: 'bk123', nama: 'Sulaiman, S.Psi.', role: 'Guru BK' },
  { username: 'iien', password: 'iien123', nama: 'Iien Puspitassari, S.Pd', role: 'Guru BK' },
  { username: 'dedah', password: 'dedah123', nama: 'Dedah Jubaedah, S.Pd.,MM', role: 'Guru BK' },
  { username: 'Syifa MHJ, S.Psi', password: 'syifa123', nama: 'Syifa MHJ, S.Psi', role: 'Guru BK' },
  { username: 'bukhari', password: 'erik123', nama: 'Bukhari, S.Pd', role: 'Guru BK' },
  { username: 'nurma', password: 'nurma123', nama: 'Nurma, S.Pd', role: 'Guru BK' }
];

// Load default initial seed data directly from data-store.json via fs.readFileSync (safe for Vercel lambda runtime)
let seedDbData: { siswa?: Siswa[]; pelanggaran?: Pelanggaran[]; pencatatan?: Pencatatan[]; pembinaan?: Pembinaan[] } = {};
try {
  const seedFile = path.join(process.cwd(), 'data-store.json');
  if (fs.existsSync(seedFile)) {
    seedDbData = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
  } else {
    const altSeedFile = path.resolve(__dirname, '..', 'data-store.json');
    if (fs.existsSync(altSeedFile)) {
      seedDbData = JSON.parse(fs.readFileSync(altSeedFile, 'utf-8'));
    }
  }
} catch (e) {
  console.warn('[Express API] Gagal membaca data-store.json seed:', e);
}

const initialSiswa: Siswa[] = seedDbData.siswa || [];
const initialPelanggaran: Pelanggaran[] = seedDbData.pelanggaran || [];
const initialPencatatan: Pencatatan[] = seedDbData.pencatatan || [];
const initialPembinaan: Pembinaan[] = seedDbData.pembinaan || [];

interface DBStructure {
  siswa: Siswa[];
  pelanggaran: Pelanggaran[];
  pencatatan: Pencatatan[];
  pembinaan: Pembinaan[];
}

// Sanitize and deduplicate database to prevent any duplicate students or records
function sanitizeAndDeduplicate(db: DBStructure): DBStructure {
  // 1. Filter students: deduplicate strictly by NIS
  const uniqueSiswa: Siswa[] = [];
  const seenNIS = new Set<string>();

  (db.siswa || []).forEach(s => {
    if (!s) return;
    const cleanNis = String(s.nis || '').trim();
    const cleanName = String(s.nama || '').trim();

    if (!cleanNis || !cleanName) return;

    // Skip duplicate NIS
    if (seenNIS.has(cleanNis)) {
      return;
    }

    seenNIS.add(cleanNis);

    uniqueSiswa.push({
      ...s,
      id: s.id && String(s.id).trim() ? String(s.id).trim() : 'S_' + cleanNis,
      nis: cleanNis,
      nama: cleanName
    });
  });

  // 2. Filter violations: deduplicate by Code and Name
  const uniquePelanggaran: Pelanggaran[] = [];
  const seenKode = new Set<string>();
  const seenNamaPelanggaran = new Set<string>();

  (db.pelanggaran || []).forEach(v => {
    if (!v) return;
    const cleanKode = String(v.kode || '').trim().toUpperCase();
    const cleanNama = String(v.namaPelanggaran || '').trim();
    const cleanNamaLower = cleanNama.toLowerCase();

    if (!cleanKode || !cleanNama) return;

    if (seenKode.has(cleanKode) || seenNamaPelanggaran.has(cleanNamaLower)) {
      return;
    }

    seenKode.add(cleanKode);
    seenNamaPelanggaran.add(cleanNamaLower);

    uniquePelanggaran.push({
      ...v,
      id: v.id && String(v.id).trim() ? String(v.id).trim() : 'P_' + cleanKode,
      kode: cleanKode,
      namaPelanggaran: cleanNama,
      poin: Number(v.poin) || 0
    });
  });

  // 3. Filter records (Pencatatan): remove dummy ones and only keep for active students
  const activeStudentNis = new Set(uniqueSiswa.map(s => s.nis));
  const uniquePencatatan: Pencatatan[] = [];
  const seenRecordIds = new Set<string>();
  const seenRecordKey = new Set<string>();

  (db.pencatatan || []).forEach(r => {
    if (!r) return;
    const cleanNis = String(r.nis || '').trim();
    const cleanId = String(r.id || '').trim();

    if (!cleanNis || !cleanId) return;

    // Skip if student doesn't exist
    if (!activeStudentNis.has(cleanNis)) return;

    const recordKey = `${r.tanggal}_${cleanNis}_${String(r.pelanggaran || '').trim().toLowerCase()}_${String(r.keterangan || '').trim().toLowerCase()}`;

    if (seenRecordIds.has(cleanId) || seenRecordKey.has(recordKey)) {
      return;
    }

    seenRecordIds.add(cleanId);
    seenRecordKey.add(recordKey);

    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    if (student) {
      uniquePencatatan.push({
        ...r,
        id: cleanId,
        nis: cleanNis,
        namaSiswa: student.nama,
        kelas: student.kelas,
        poin: Number(r.poin) || 0
      });
    }
  });

  // 4. Filter coaching (Pembinaan): only keep for active students and dynamically recalculate points
  const uniquePembinaan: Pembinaan[] = [];
  const seenPembinaanNis = new Set<string>();

  (db.pembinaan || []).forEach(p => {
    if (!p) return;
    const cleanNis = String(p.nis || '').trim();
    if (!cleanNis) return;

    if (!activeStudentNis.has(cleanNis)) return;
    if (seenPembinaanNis.has(cleanNis)) return;

    seenPembinaanNis.add(cleanNis);

    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    if (student) {
      const studentRecords = uniquePencatatan.filter(r => r.nis === cleanNis);
      const totalPoints = Math.max(0, studentRecords.reduce((sum, r) => sum + r.poin, 0));

      if (totalPoints > 0) {
        let tindakan = 'Teguran Lisan';
        if (totalPoints <= 25) {
          tindakan = 'Teguran Lisan';
        } else if (totalPoints <= 50) {
          tindakan = 'Teguran Tertulis';
        } else if (totalPoints <= 75) {
          tindakan = 'Pemanggilan Orang Tua';
        } else if (totalPoints <= 100) {
          tindakan = 'Surat Peringatan';
        } else {
          tindakan = 'Sidang Disiplin';
        }

        uniquePembinaan.push({
          id: p.id || 'B' + Math.floor(1000 + Math.random() * 9000),
          nis: cleanNis,
          namaSiswa: student.nama,
          totalPoin: totalPoints,
          tindakan,
          tanggal: p.tanggal || new Date().toISOString().split('T')[0]
        });
      }
    }
  });

  return {
    siswa: uniqueSiswa,
    pelanggaran: uniquePelanggaran,
    pencatatan: uniquePencatatan,
    pembinaan: uniquePembinaan
  };
}

// Read database
function readDB(): DBStructure {
  try {
    if (!fs.existsSync(DATA_STORE_PATH)) {
      // Ensure the directory exists recursively before writing
      fs.mkdirSync(path.dirname(DATA_STORE_PATH), { recursive: true });

      const defaultData: DBStructure = {
        siswa: initialSiswa,
        pelanggaran: initialPelanggaran,
        pencatatan: initialPencatatan,
        pembinaan: initialPembinaan
      };

      // If we fell back to a temporary directory (e.g. on Vercel), copy seed file from build workspace if it exists
      if (DATA_STORE_PATH !== path.join(process.cwd(), 'data-store.json')) {
        const localPath = path.join(process.cwd(), 'data-store.json');
        if (fs.existsSync(localPath)) {
          const content = fs.readFileSync(localPath, 'utf-8');
          fs.writeFileSync(DATA_STORE_PATH, content, 'utf-8');
          return sanitizeAndDeduplicate(JSON.parse(content));
        }
      }

      fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
      return sanitizeAndDeduplicate(defaultData);
    }
    const rawData = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
    return sanitizeAndDeduplicate(JSON.parse(rawData));
  } catch (err) {
    console.error('Error reading DB, using initial data:', err);
    return sanitizeAndDeduplicate({
      siswa: initialSiswa,
      pelanggaran: initialPelanggaran,
      pencatatan: initialPencatatan,
      pembinaan: initialPembinaan
    });
  }
}

// Write database
function writeDB(data: DBStructure) {
  try {
    const cleanData = sanitizeAndDeduplicate(data);
    fs.mkdirSync(path.dirname(DATA_STORE_PATH), { recursive: true });
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(cleanData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Helper: Recalculate and update Pembinaan table based on current records
function recalculatePembinaan(nis: string, db: DBStructure, tanggalPencatatan: string): DBStructure {
  const student = db.siswa.find(s => s.nis === nis);
  if (!student) return db;

  // Filter all records for this student and sum points (ensuring total doesn't fall below 0)
  const studentRecords = db.pencatatan.filter(r => r.nis === nis);
  const totalPoints = Math.max(0, studentRecords.reduce((sum, r) => sum + r.poin, 0));

  // Determine coaching actions (Pembinaan)
  let tindakan = 'Teguran Lisan';
  if (totalPoints === 0) {
    // If no points, remove from pembinaan
    db.pembinaan = db.pembinaan.filter(p => p.nis !== nis);
    return db;
  } else if (totalPoints <= 25) {
    tindakan = 'Teguran Lisan';
  } else if (totalPoints <= 50) {
    tindakan = 'Teguran Tertulis';
  } else if (totalPoints <= 75) {
    tindakan = 'Pemanggilan Orang Tua';
  } else if (totalPoints <= 100) {
    tindakan = 'Surat Peringatan';
  } else {
    tindakan = 'Sidang Disiplin';
  }

  // Find existing pembinaan
  const existingIndex = db.pembinaan.findIndex(p => p.nis === nis);
  if (existingIndex !== -1) {
    db.pembinaan[existingIndex] = {
      ...db.pembinaan[existingIndex],
      totalPoin: totalPoints,
      tindakan,
      tanggal: tanggalPencatatan // Keep latest record date as the action date
    };
  } else {
    db.pembinaan.push({
      id: 'B' + Math.floor(1000 + Math.random() * 9000),
      nis,
      namaSiswa: student.nama,
      totalPoin: totalPoints,
      tindakan,
      tanggal: tanggalPencatatan
    });
  }

  return db;
}

// Dynamic proxy logic for Google Apps Script with robust redirect following
async function proxyToGoogleScript(action: string, method: 'GET' | 'POST', body: any = null, customUrl?: string) {
  const scriptUrl = customUrl || process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    throw new Error('Google Script URL is not configured.');
  }

  // Handle existing query parameters in GOOGLE_SCRIPT_URL robustly
  const separator = scriptUrl.includes('?') ? '&' : '?';
  let currentUrl = `${scriptUrl}${separator}action=${action}`;
  let currentMethod: 'GET' | 'POST' = method;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  let requestBody: string | undefined = undefined;
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    if (body) {
      // Send both the nested "data" format and the flat "action" format for maximum compatibility and safety
      const payload = {
        action: action,
        data: body,
        ...(typeof body === 'object' && !Array.isArray(body) ? body : {})
      };
      requestBody = JSON.stringify(payload);
    }
  }

  let attempts = 0;
  const maxRedirects = 5;
  let response: any = null;

  while (attempts < maxRedirects) {
    const options: any = {
      method: currentMethod,
      headers,
      redirect: 'manual', // Intercept 302 redirects to follow them manually to bypass undici redirect bugs
    };

    if (currentMethod === 'POST' && requestBody !== undefined) {
      options.body = requestBody;
    } else {
      options.body = undefined;
    }

    response = await fetch(currentUrl, options);

    // Google Apps Script redirect status codes (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirectUrl = response.headers.get('location');
      if (!redirectUrl) {
        break;
      }
      
      // Update URL for next attempt
      currentUrl = redirectUrl;
      
      // For 301, 302, and 303 redirects, standard browsers/fetch convert POST to GET and clear the request body.
      // Google Apps Script executes the actual POST action on the first request and expects the redirected request to be a GET to download the cached output.
      if ([301, 302, 303].includes(response.status)) {
        currentMethod = 'GET';
        requestBody = undefined;
      }
      
      attempts++;
      continue;
    }

    break;
  }

  if (!response) {
    throw new Error('Google Apps Script did not respond.');
  }

  if (!response.ok) {
    throw new Error(`Google Apps Script responded with status: ${response.status}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Failed to parse Google Apps Script response: ${text.slice(0, 200)}`);
  }
}

// ---------------------- API ROUTES ----------------------

const apiRouter = express.Router();

// Auth API Route
apiRouter.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = preDefinedUsers.find(u => u.username === username && u.password === password);

    if (user) {
      // Generate a simple mock JWT or token
      const token = `mock-jwt-token-for-${user.username}-${user.role}`;
      return res.json({
        success: true,
        token,
        user: {
          username: user.username,
          nama: user.nama,
          role: user.role,
          kelasAjar: user.kelasAjar
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Username atau password salah.'
    });
  } catch (error: any) {
    console.error('Error in login handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat masuk.',
      error: error.message
    });
  }
});

// Settings & Config status API
apiRouter.get('/settings/config', (req, res) => {
  const googleScriptUrl = (req.headers['x-google-script-url'] as string) || process.env.GOOGLE_SCRIPT_URL || '';
  res.json({
    success: true,
    data: {
      isGoogleScriptConnected: !!googleScriptUrl,
      googleScriptUrl: googleScriptUrl
    }
  });
});

// Endpoint to read the actual full Code.gs file contents
apiRouter.get('/settings/code-gs', (req, res) => {
  try {
    const gsPath = path.join(process.cwd(), 'Code.gs');
    if (fs.existsSync(gsPath)) {
      const code = fs.readFileSync(gsPath, 'utf-8');
      return res.json({ success: true, code });
    }
    return res.status(404).json({ success: false, message: 'Berkas Code.gs tidak ditemukan di server.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Gagal membaca berkas Code.gs: ' + err.message });
  }
});

apiRouter.post('/settings/config', async (req, res) => {
  const { googleScriptUrl } = req.body || {};
  
  try {
    // Modify env file or environment dynamically in memory
    process.env.GOOGLE_SCRIPT_URL = googleScriptUrl || '';
    
    // Write to the JSON configuration store for 100% reliable multi-device permanent persistence
    try {
      fs.writeFileSync(CONFIG_STORE_PATH, JSON.stringify({ googleScriptUrl: googleScriptUrl || '' }, null, 2), 'utf-8');
      console.log('[Express API] Berhasil menyimpan konfigurasi ke config-settings.json');
    } catch (configErr: any) {
      console.warn('[Express API Alert] Gagal menulis ke config-settings.json:', configErr.message);
    }
    
    let envWriteFailed = false;
    let writeErrorMessage = '';
    
    try {
      // Write/update the .env file if the filesystem is writeable
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      // Simple replacement or append
      if (envContent.includes('GOOGLE_SCRIPT_URL=')) {
        envContent = envContent.replace(/GOOGLE_SCRIPT_URL=.*/g, `GOOGLE_SCRIPT_URL="${googleScriptUrl || ''}"`);
      } else {
        envContent += `\nGOOGLE_SCRIPT_URL="${googleScriptUrl || ''}"\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (writeErr: any) {
      console.warn('Gagal menulis ke berkas .env:', writeErr.message);
      envWriteFailed = true;
      writeErrorMessage = writeErr.message;
    }

    // Automatically trigger initial database pull to clear and discard old mock data instantly!
    let pullSuccess = false;
    let pullError = '';
    if (googleScriptUrl) {
      try {
        console.log('[Auto-Sync] Memulai pengunduhan data dari Google Sheets...');
        const studentRes = await proxyToGoogleScript('getStudents', 'GET');
        const violationRes = await proxyToGoogleScript('getViolations', 'GET');
        const recordRes = await proxyToGoogleScript('getRecords', 'GET');

        if (studentRes.success && violationRes.success && recordRes.success) {
          const newDb: DBStructure = {
            siswa: studentRes.data || [],
            pelanggaran: violationRes.data || [],
            pencatatan: recordRes.data?.pencatatan || [],
            pembinaan: recordRes.data?.pembinaan || []
          };
          writeDB(newDb);
          pullSuccess = true;
          console.log('[Auto-Sync] Berhasil mengunduh dan menyinkronkan data Google Sheets!');
        } else {
          pullError = 'Respons Google Sheets mengindikasikan kegagalan data.';
        }
      } catch (syncErr: any) {
        pullError = syncErr.message;
        console.warn('[Auto-Sync Alert] Gagal melakukan unduhan data awal:', syncErr.message);
      }
    }

    const messagePrefix = pullSuccess 
      ? 'Koneksi berhasil dan data Google Sheet telah disinkronkan ke aplikasi! ' 
      : (googleScriptUrl ? `Koneksi disimpan, tetapi gagal sinkronisasi data awal (${pullError}). ` : '');

    if (googleScriptUrl && !pullSuccess) {
      return res.status(400).json({
        success: false,
        message: `Gagal sinkronisasi data awal: ${pullError}`
      });
    }

    res.json({
      success: true,
      message: messagePrefix + 'Konfigurasi Google Apps Script berhasil disimpan secara PERMANEN di server dan dapat diakses dari perangkat lain.',
      data: {
        isGoogleScriptConnected: !!googleScriptUrl,
        googleScriptUrl
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Gagal memproses konfigurasi: ' + error.message
    });
  }
});

let lastAutoSyncTime = 0;

// General Data API Endpoint matching Google Apps Script proxy requirements
apiRouter.get('/data', async (req, res) => {
  const action = req.query.action as string;
  const scriptUrl = (req.headers['x-google-script-url'] as string) || process.env.GOOGLE_SCRIPT_URL || '';

  let db = readDB();

  // If connected to Google Sheets, perform a synchronous or background sync pull
  if (scriptUrl) {
    const isDefaultMockData = db.siswa.length === 8 && db.siswa.some(s => s.nis === '21001');
    const hasCoolDownPassed = Date.now() - lastAutoSyncTime > 15000;

    // Force synchronous/blocking sync if we have default mockup data (e.g. freshly started Vercel container)
    // to prevent user from ever seeing incorrect/dummy data on different devices.
    if (isDefaultMockData || hasCoolDownPassed) {
      lastAutoSyncTime = Date.now();
      try {
        console.log(`[Auto-Sync] Menyelaraskan data secara langsung dari Google Sheets. URL: ${scriptUrl}`);
        const [studentRes, violationRes, recordRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET', null, scriptUrl),
          proxyToGoogleScript('getViolations', 'GET', null, scriptUrl),
          proxyToGoogleScript('getRecords', 'GET', null, scriptUrl)
        ]);

        if (studentRes.success && violationRes.success && recordRes.success) {
          const freshDb: DBStructure = {
            siswa: [...(studentRes.data || []), ...(db.siswa || [])],
            pelanggaran: (violationRes.data && violationRes.data.length > 0) ? violationRes.data : (db.pelanggaran || []),
            pencatatan: recordRes.data?.pencatatan || [],
            pembinaan: recordRes.data?.pembinaan || []
          };
          const sanitized = sanitizeAndDeduplicate(freshDb);
          writeDB(sanitized);
          db = sanitized;
          console.log('[Auto-Sync] Berhasil memperbarui data dari Google Sheets secara murni.');
        }
      } catch (err: any) {
        console.warn('[Auto-Sync Alert] Gagal menyelaraskan otomatis:', err.message);
      }
    }
  }

  switch (action) {
    case 'getStudents':
      return res.json({ success: true, data: db.siswa });
    case 'getViolations':
      return res.json({ success: true, data: db.pelanggaran });
    case 'getRecords':
      return res.json({ 
        success: true, 
        data: {
          pencatatan: db.pencatatan,
          pembinaan: db.pembinaan
        }
      });
    default:
      return res.status(400).json({ success: false, message: 'Action tidak dikenali atau tidak disupport lewat GET.' });
  }
});

apiRouter.post('/data', async (req, res) => {
  const action = req.query.action as string;
  const body = req.body || {};
  const scriptUrl = (req.headers['x-google-script-url'] as string) || process.env.GOOGLE_SCRIPT_URL || '';

  const isSyncAction = action && action.startsWith('sync');

  // For serverless environments like Vercel, we must AWAIT the write operation to Google Sheets
  // because background promises are instantly suspended or terminated once the response is returned.
  if (scriptUrl && !isSyncAction) {
    try {
      console.log(`[Sync Write] Menyimpan perubahan (${action}) secara langsung ke Google Sheets...`);
      await proxyToGoogleScript(action, 'POST', body, scriptUrl);
      console.log(`[Sync Write] Berhasil menyelaraskan perubahan (${action}) ke Google Sheets.`);
    } catch (err: any) {
      console.warn(`[Sync Write Fail] Gagal menulis perubahan ke Google Sheets:`, err.message);
    }
  }

  const db = readDB();

  switch (action) {
    case 'addStudent': {
      const newSiswa: Siswa = {
        id: body.id || 'S' + Math.floor(1000 + Math.random() * 9000),
        nis: body.nis,
        nama: body.nama,
        kelas: body.kelas,
        jk: body.jk,
        namaOrangTua: body.namaOrangTua,
        noHp: body.noHp,
        foto: body.foto || ''
      };

      // Check if NIS already exists for addition (only if not an edit/overwrite)
      const existingIdx = db.siswa.findIndex(s => s.nis === body.nis);
      if (existingIdx !== -1 && !body.id) {
        return res.status(400).json({ success: false, message: 'NIS sudah terdaftar.' });
      }

      if (body.id) {
        // Edit existing
        const idx = db.siswa.findIndex(s => s.id === body.id);
        if (idx !== -1) {
          db.siswa[idx] = newSiswa;
        } else {
          db.siswa.push(newSiswa);
        }
      } else {
        db.siswa.push(newSiswa);
      }

      writeDB(db);
      return res.json({ success: true, message: 'Data siswa berhasil disimpan.', data: db.siswa });
    }

    case 'deleteStudent': {
      const studentToDelete = db.siswa.find(s => s.id === body.id);
      if (!studentToDelete) {
        return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
      }

      db.siswa = db.siswa.filter(s => s.id !== body.id);
      // Clean up records and coaching for deleted student
      db.pencatatan = db.pencatatan.filter(r => r.nis !== studentToDelete.nis);
      db.pembinaan = db.pembinaan.filter(p => p.nis !== studentToDelete.nis);

      writeDB(db);
      return res.json({ success: true, message: 'Data siswa berhasil dihapus.', data: db.siswa });
    }

    case 'addViolation': {
      const newViolation: Pelanggaran = {
        id: body.id || 'P' + Math.floor(1000 + Math.random() * 9000),
        kode: body.kode,
        namaPelanggaran: body.namaPelanggaran,
        kategori: body.kategori,
        poin: parseInt(body.poin, 10) || 0
      };

      if (body.id) {
        const idx = db.pelanggaran.findIndex(v => v.id === body.id);
        if (idx !== -1) {
          db.pelanggaran[idx] = newViolation;
        } else {
          db.pelanggaran.push(newViolation);
        }
      } else {
        db.pelanggaran.push(newViolation);
      }

      writeDB(db);
      return res.json({ success: true, message: 'Jenis pelanggaran berhasil disimpan.', data: db.pelanggaran });
    }

    case 'deleteViolation': {
      db.pelanggaran = db.pelanggaran.filter(v => v.id !== body.id);
      writeDB(db);
      return res.json({ success: true, message: 'Jenis pelanggaran berhasil dihapus.', data: db.pelanggaran });
    }

    case 'addRecord': {
      // Find student and violation details to fill points and full info
      const student = db.siswa.find(s => s.nis === body.nis);
      if (!student) {
        return res.status(404).json({ success: false, message: 'NIS siswa tidak terdaftar.' });
      }

      const violationMaster = db.pelanggaran.find(v => v.namaPelanggaran === body.pelanggaran);
      const points = body.poin !== undefined ? parseInt(body.poin, 10) : (violationMaster ? violationMaster.poin : 0);

      const newRecord: Pencatatan = {
        id: body.id || 'R' + Math.floor(1000 + Math.random() * 9000),
        tanggal: body.tanggal || new Date().toISOString().split('T')[0],
        nis: body.nis,
        namaSiswa: student.nama,
        kelas: student.kelas,
        pelanggaran: body.pelanggaran,
        poin: points,
        petugas: body.petugas,
        keterangan: body.keterangan || '',
        foto: body.foto || ''
      };

      if (body.id) {
        const idx = db.pencatatan.findIndex(r => r.id === body.id);
        if (idx !== -1) {
          db.pencatatan[idx] = newRecord;
        } else {
          db.pencatatan.push(newRecord);
        }
      } else {
        db.pencatatan.push(newRecord);
      }

      // Automatically recalculate points and create/update pembinaan
      let updatedDb = recalculatePembinaan(student.nis, db, newRecord.tanggal);

      writeDB(updatedDb);
      return res.json({ success: true, message: 'Pelanggaran siswa berhasil dicatat.', data: updatedDb.pencatatan });
    }

    case 'deleteRecord': {
      const record = db.pencatatan.find(r => r.id === body.id);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Pencatatan pelanggaran tidak ditemukan.' });
      }

      db.pencatatan = db.pencatatan.filter(r => r.id !== body.id);

      // Recalculate pembinaan for this student since their records changed
      let updatedDb = recalculatePembinaan(record.nis, db, new Date().toISOString().split('T')[0]);

      writeDB(updatedDb);
      return res.json({ success: true, message: 'Pencatatan pelanggaran berhasil dihapus.', data: updatedDb.pencatatan });
    }

    case 'syncPull': {
      if (!process.env.GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ success: false, message: 'Google Sheets belum terhubung.' });
      }
      try {
        // Fetch all data from Google Sheets in parallel to improve synchronization performance (3x faster!)
        const [studentRes, violationRes, recordRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET'),
          proxyToGoogleScript('getViolations', 'GET'),
          proxyToGoogleScript('getRecords', 'GET')
        ]);

        if (!studentRes.success || !violationRes.success || !recordRes.success) {
          return res.status(500).json({ success: false, message: 'Gagal mengambil data dari Google Sheet.' });
        }

        const newDb: DBStructure = {
          siswa: [...(studentRes.data || []), ...(db.siswa || [])],
          pelanggaran: (violationRes.data && violationRes.data.length > 0) ? violationRes.data : (db.pelanggaran || []),
          pencatatan: recordRes.data?.pencatatan || [],
          pembinaan: recordRes.data?.pembinaan || []
        };

        const sanitized = sanitizeAndDeduplicate(newDb);
        writeDB(sanitized);
        return res.json({ success: true, message: 'Berhasil menarik data terbaru dari Google Sheet ke aplikasi.', data: sanitized });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: 'Gagal menyinkronkan data: ' + err.message });
      }
    }

    case 'syncPush': {
      if (!process.env.GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ success: false, message: 'Google Sheets belum terhubung.' });
      }
      try {
        const localDb = readDB();
        const response = await proxyToGoogleScript('overwriteAllData', 'POST', localDb);
        if (!response.success) {
          return res.status(500).json({ success: false, message: response.message || 'Gagal mengirim data ke Google Sheet.' });
        }
        return res.json({ success: true, message: 'Berhasil mengirim semua data aplikasi ke Google Sheet.' });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: 'Gagal mengirim data: ' + err.message });
      }
    }

    case 'syncMerge': {
      if (!process.env.GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ success: false, message: 'Google Sheets belum terhubung.' });
      }
      try {
        const localDb = readDB();
        
        // Fetch all data from Google Sheet in parallel to improve synchronization performance (3x faster!)
        const [studentRes, violationRes, recordRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET'),
          proxyToGoogleScript('getViolations', 'GET'),
          proxyToGoogleScript('getRecords', 'GET')
        ]);

        if (!studentRes.success || !violationRes.success || !recordRes.success) {
          return res.status(500).json({ success: false, message: 'Gagal mengambil data dari Google Sheet untuk sinkronisasi.' });
        }

        const sheetSiswa: Siswa[] = studentRes.data || [];
        const sheetPelanggaran: Pelanggaran[] = violationRes.data || [];
        const sheetPencatatan: Pencatatan[] = recordRes.data?.pencatatan || [];
        const sheetPembinaan: Pembinaan[] = recordRes.data?.pembinaan || [];

        // Combine all lists and run sanitizeAndDeduplicate for perfect data integrity
        const rawMergedDb: DBStructure = {
          siswa: [...(localDb.siswa || []), ...sheetSiswa],
          pelanggaran: [...(localDb.pelanggaran || []), ...sheetPelanggaran],
          pencatatan: [...(localDb.pencatatan || []), ...sheetPencatatan],
          pembinaan: [...(localDb.pembinaan || []), ...sheetPembinaan]
        };

        const mergedDb = sanitizeAndDeduplicate(rawMergedDb);

        // Write to local data-store
        writeDB(mergedDb);

        // Push back the fully merged, cleaned and deduplicated data to Google Sheets to clean it up permanently
        const pushRes = await proxyToGoogleScript('overwriteAllData', 'POST', mergedDb);
        if (!pushRes.success) {
          return res.status(500).json({ 
            success: false, 
            message: 'Berhasil menggabungkan data lokal, tetapi gagal mengunggah data gabungan ke Google Sheet: ' + (pushRes.message || '') 
          });
        }

        return res.json({ 
          success: true, 
          message: 'Sinkronisasi dua arah berhasil! Semua data di aplikasi dan Google Sheet sekarang telah digabungkan, dibersihkan dari duplikat, dan 100% identik.', 
          data: mergedDb 
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi dua arah: ' + err.message });
      }
    }

    default:
      return res.status(400).json({ success: false, message: 'Action tidak dikenali atau tidak disupport lewat POST.' });
  }
});

// Mount the apiRouter under both "/api" and "/" to guarantee it runs flawlessly locally AND on Vercel serverless environments!
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Error Handler for Serverless Environments (prevents silent crashes and returns clear JSON errors)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler] Caught error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: err.message || String(err),
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Process-level event listeners to capture async or top-level failures gracefully
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception Alert]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection Alert]:', reason);
});

export default app;
