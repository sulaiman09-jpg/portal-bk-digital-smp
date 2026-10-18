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

export interface ActionPlan {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  judulTarget: string;
  kategoriTarget: 'Kedisiplinan' | 'Akademik' | 'Kerapian' | 'Etika & Sikap' | 'Sosial & Emosi';
  deskripsiRencana: string;
  indikatorKeberhasilan: string;
  tenggatWaktu: string;
  tanggalDibuat: string;
  status: 'Direncanakan' | 'Sedang Berjalan' | 'Tercapai' | 'Perlu Evaluasi Ulang';
  poinTargetPengurangan?: number;
  pembimbing: string;
  catatanEvaluasi?: string;
  tanggalEvaluasiTerakhir?: string;
}

export interface KehadiranData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  mingguKe: string;
  bulan: string;
  tahun: string;
  status?: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';
  hadir?: number;
  sakit?: number;
  izin?: number;
  alfa?: number;
  jumlah?: number;
  keterangan: string;
}

export interface KonselingData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  jenisKonseling: 'Individu' | 'Kelompok' | 'Klasikal';
  tanggal: string;
  permasalahanUtama: string;
  analisisBK: string;
  solusiRekomendasi: string;
  hasilEvaluasi: string;
  tindakLanjut: string;
  petugas?: string;
}

export interface AsesmenData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  hasilAKPD: string;
  gayaBelajar: string;
  aum: string;
  psikotes: string;
  minatBakat: string;
}

export interface KunjunganRumahData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  tanggalKunjungan: string;
  tujuanKunjungan: string;
  hasilTemuan: string;
  petugas?: string;
}

export interface SnbpData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  namaUniversitas: string;
  programStudi: string;
  keteranganLulus: 'Lulus' | 'Tidak Lulus';
  tahun: string;
  catatan?: string;
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
  let loadedUrl = '';
  if (fs.existsSync(CONFIG_STORE_PATH)) {
    const configData = JSON.parse(fs.readFileSync(CONFIG_STORE_PATH, 'utf-8'));
    if (configData && configData.googleScriptUrl) loadedUrl = configData.googleScriptUrl;
  }
  
  if (!loadedUrl) {
    const localConfig = path.join(process.cwd(), 'config-settings.json');
    if (fs.existsSync(localConfig)) {
      const configData = JSON.parse(fs.readFileSync(localConfig, 'utf-8'));
      if (configData && configData.googleScriptUrl) loadedUrl = configData.googleScriptUrl;
    }
  }

  if (!loadedUrl) {
    const altConfig = path.resolve(__dirname, '..', 'config-settings.json');
    if (fs.existsSync(altConfig)) {
      const configData = JSON.parse(fs.readFileSync(altConfig, 'utf-8'));
      if (configData && configData.googleScriptUrl) loadedUrl = configData.googleScriptUrl;
    }
  }

  if (loadedUrl && !process.env.GOOGLE_SCRIPT_URL) {
    process.env.GOOGLE_SCRIPT_URL = loadedUrl;
    console.log(`[Express API] Loaded GOOGLE_SCRIPT_URL from config-settings.json: ${process.env.GOOGLE_SCRIPT_URL}`);
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
let seedDbData: { 
  siswa?: Siswa[]; 
  pelanggaran?: Pelanggaran[]; 
  pencatatan?: Pencatatan[]; 
  pembinaan?: Pembinaan[]; 
  kehadiran?: KehadiranData[];
  konseling?: KonselingData[];
  asesmen?: AsesmenData[];
  kunjungan?: KunjunganRumahData[];
  snbp?: SnbpData[];
  actionPlans?: ActionPlan[];
} = {};
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

const DEFAULT_MASTER_PELANGGARAN: Pelanggaran[] = [
  // Kategori Ringan (Poin 5 - 15)
  { id: 'P_P01', kode: 'P01', namaPelanggaran: 'Terlambat masuk sekolah / kelas (< 15 menit)', kategori: 'Ringan', poin: 5 },
  { id: 'P_P02', kode: 'P02', namaPelanggaran: 'Terlambat masuk sekolah (> 15 menit)', kategori: 'Ringan', poin: 10 },
  { id: 'P_P03', kode: 'P03', namaPelanggaran: 'Tidak memakai atribut seragam lengkap (topi/dasi/ikat pinggang/kaos kaki)', kategori: 'Ringan', poin: 5 },
  { id: 'P_P04', kode: 'P04', namaPelanggaran: 'Memakai seragam tidak sesuai ketentuan hari / baju tidak dimasukkan / tidak rapi', kategori: 'Ringan', poin: 5 },
  { id: 'P_P05', kode: 'P05', namaPelanggaran: 'Rambut gondrong / diwarnai / tidak sesuai ketentuan sekolah', kategori: 'Ringan', poin: 10 },
  { id: 'P_P06', kode: 'P06', namaPelanggaran: 'Membuang sampah sembarangan di lingkungan sekolah', kategori: 'Ringan', poin: 5 },
  { id: 'P_P07', kode: 'P07', namaPelanggaran: 'Menggunakan HP / gadget tanpa izin guru saat jam pelajaran (KBM)', kategori: 'Ringan', poin: 10 },
  { id: 'P_P08', kode: 'P08', namaPelanggaran: 'Makan / minum di dalam kelas saat kegiatan belajar mengajar berlangsung', kategori: 'Ringan', poin: 5 },
  { id: 'P_P09', kode: 'P09', namaPelanggaran: 'Memakai make-up / perhiasan berlebihan / bertato / bertindik (putra)', kategori: 'Ringan', poin: 10 },
  { id: 'P_P10', kode: 'P10', namaPelanggaran: 'Tidak membawa buku pelajaran / tidak mengerjakan tugas sekolah', kategori: 'Ringan', poin: 5 },
  { id: 'P_P11', kode: 'P11', namaPelanggaran: 'Keluar kelas tanpa izin guru piket / guru pengajar saat KBM', kategori: 'Ringan', poin: 5 },
  { id: 'P_P12', kode: 'P12', namaPelanggaran: 'Tidak mengikuti upacara bendera / apel pagi / pembiasaan tanpa izin', kategori: 'Ringan', poin: 15 },

  // Kategori Sedang (Poin 20 - 40)
  { id: 'P_P13', kode: 'P13', namaPelanggaran: 'Tidak masuk sekolah tanpa keterangan / Alpa (1 hari)', kategori: 'Sedang', poin: 20 },
  { id: 'P_P14', kode: 'P14', namaPelanggaran: 'Meninggalkan sekolah sebelum jam pelajaran usai tanpa izin (Membolos)', kategori: 'Sedang', poin: 25 },
  { id: 'P_P15', kode: 'P15', namaPelanggaran: 'Melompati pagar / jendela / pintu gerbang sekolah', kategori: 'Sedang', poin: 30 },
  { id: 'P_P16', kode: 'P16', namaPelanggaran: 'Mencontek / berbuat curang saat ulangan / ujian semester', kategori: 'Sedang', poin: 25 },
  { id: 'P_P17', kode: 'P17', namaPelanggaran: 'Bersikap tidak sopan / membantah / menentang guru atau staf sekolah', kategori: 'Sedang', poin: 30 },
  { id: 'P_P18', kode: 'P18', namaPelanggaran: 'Membawa / merokok / rokok elektrik (vape) di lingkungan sekolah', kategori: 'Sedang', poin: 35 },
  { id: 'P_P19', kode: 'P19', namaPelanggaran: 'Mencoret-coret dinding, meja, kursi, merusak fasilitas sekolah (Vandalisme)', kategori: 'Sedang', poin: 25 },
  { id: 'P_P20', kode: 'P20', namaPelanggaran: 'Mengendarai motor knalpot bising / ugal-ugalan di area sekolah', kategori: 'Sedang', poin: 25 },
  { id: 'P_P21', kode: 'P21', namaPelanggaran: 'Mengintimidasi / mengejek / mengancam sesama siswa (Bullying verbal)', kategori: 'Sedang', poin: 35 },
  { id: 'P_P22', kode: 'P22', namaPelanggaran: 'Membawa barang terlarang / bermain judi / kartu di sekolah', kategori: 'Sedang', poin: 20 },

  // Kategori Berat (Poin 50 - 100)
  { id: 'P_P23', kode: 'P23', namaPelanggaran: 'Terlibat perkelahian / tawuran antar siswa atau antar sekolah', kategori: 'Berat', poin: 75 },
  { id: 'P_P24', kode: 'P24', namaPelanggaran: 'Membawa senjata tajam (sajam) / senjata api / benda berbahaya ke sekolah', kategori: 'Berat', poin: 75 },
  { id: 'P_P25', kode: 'P25', namaPelanggaran: 'Melakukan pemalakan / pemerasan / pencurian uang atau barang milik orang lain', kategori: 'Berat', poin: 50 },
  { id: 'P_P26', kode: 'P26', namaPelanggaran: 'Membawa / mengonsumsi / mengedarkan minuman keras / alkohol', kategori: 'Berat', poin: 75 },
  { id: 'P_P27', kode: 'P27', namaPelanggaran: 'Membawa / menggunakan / mengedarkan narkoba atau obat-obatan terlarang', kategori: 'Berat', poin: 100 },
  { id: 'P_P28', kode: 'P28', namaPelanggaran: 'Melakukan pelecehan seksual / perbuatan asusila di lingkungan sekolah', kategori: 'Berat', poin: 100 },
  { id: 'P_P29', kode: 'P29', namaPelanggaran: 'Melakukan kekerasan fisik (Bullying fisik) yang mencederai orang lain', kategori: 'Berat', poin: 75 },
  { id: 'P_P30', kode: 'P30', namaPelanggaran: 'Menyebarkan konten pornografi / mencemarkan nama baik sekolah di media sosial', kategori: 'Berat', poin: 75 },
  { id: 'P_P31', kode: 'P31', namaPelanggaran: 'Memalsukan tanda tangan kepala sekolah / guru / surat izin sekolah', kategori: 'Berat', poin: 50 }
];

const initialSiswa: Siswa[] = seedDbData.siswa || [];
const initialPelanggaran: Pelanggaran[] = (seedDbData.pelanggaran && seedDbData.pelanggaran.length > 0) ? seedDbData.pelanggaran : DEFAULT_MASTER_PELANGGARAN;
const initialPencatatan: Pencatatan[] = seedDbData.pencatatan || [];
const initialPembinaan: Pembinaan[] = seedDbData.pembinaan || [];
const initialKehadiran: KehadiranData[] = seedDbData.kehadiran || [];
const initialKonseling: KonselingData[] = seedDbData.konseling || [];
const initialAsesmen: AsesmenData[] = seedDbData.asesmen || [];
const initialKunjungan: KunjunganRumahData[] = seedDbData.kunjungan || [];
const initialSnbp: SnbpData[] = seedDbData.snbp || [];
const initialActionPlans: ActionPlan[] = seedDbData.actionPlans || [];

interface DBStructure {
  siswa: Siswa[];
  pelanggaran: Pelanggaran[];
  pencatatan: Pencatatan[];
  pembinaan: Pembinaan[];
  kehadiran: KehadiranData[];
  konseling?: KonselingData[];
  asesmen?: AsesmenData[];
  kunjungan?: KunjunganRumahData[];
  snbp?: SnbpData[];
  actionPlans?: ActionPlan[];
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

  const violationsSource = (db.pelanggaran && db.pelanggaran.length > 0) ? db.pelanggaran : DEFAULT_MASTER_PELANGGARAN;

  violationsSource.forEach(v => {
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

  if (uniquePelanggaran.length === 0) {
    uniquePelanggaran.push(...DEFAULT_MASTER_PELANGGARAN);
  }

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

  // 5. Filter attendance (Kehadiran): deduplicate by ID or composite key (NIS + mingguKe + bulan + tahun)
  const uniqueKehadiran: KehadiranData[] = [];
  const seenKehadiranIds = new Set<string>();
  const seenKehadiranComposite = new Set<string>();

  (db.kehadiran || []).forEach(h => {
    if (!h) return;
    const cleanNis = String(h.nis || '').trim();
    const cleanId = String(h.id || '').trim();
    const cleanMinggu = String(h.mingguKe || '').trim();
    const cleanBulan = String(h.bulan || '').trim();
    const cleanTahun = String(h.tahun || '').trim();

    if (!cleanNis || !cleanMinggu || !cleanBulan) return;
    if (!activeStudentNis.has(cleanNis)) return;

    const compKey = `${cleanNis}_${cleanMinggu}_${cleanBulan}_${cleanTahun}`;
    if (seenKehadiranIds.has(cleanId) || seenKehadiranComposite.has(compKey)) {
      return;
    }

    if (cleanId) seenKehadiranIds.add(cleanId);
    seenKehadiranComposite.add(compKey);

    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    if (student) {
      const hadir = Number(h.hadir || 0);
      const sakit = Number(h.sakit || 0);
      const izin = Number(h.izin || 0);
      const alfa = Number(h.alfa || 0);
      const jumlah = h.jumlah !== undefined ? Number(h.jumlah) : (hadir + sakit + izin + alfa);
      const status = h.status || (hadir > 0 ? 'Hadir' : (sakit > 0 ? 'Sakit' : (izin > 0 ? 'Izin' : 'Alfa')));

      uniqueKehadiran.push({
        ...h,
        id: cleanId || 'H_' + compKey,
        nis: cleanNis,
        namaSiswa: student.nama,
        kelas: student.kelas,
        mingguKe: cleanMinggu,
        bulan: cleanBulan,
        tahun: cleanTahun,
        hadir,
        sakit,
        izin,
        alfa,
        jumlah,
        status,
        keterangan: String(h.keterangan || '')
      });
    }
  });

  // 6. Filter konseling (Konseling BK): deduplicate by ID or (nis + tanggal + jenisKonseling)
  const uniqueKonseling: KonselingData[] = [];
  const seenKonselingIds = new Set<string>();
  const seenKonselingKey = new Set<string>();

  (db.konseling || []).forEach(k => {
    if (!k) return;
    const cleanNis = String(k.nis || '').trim();
    const cleanId = String(k.id || '').trim();
    if (!cleanNis) return;
    if (!activeStudentNis.has(cleanNis)) return;

    const kKey = `${cleanNis}_${String(k.tanggal || '').split('T')[0]}_${String(k.jenisKonseling || 'Individu')}`;
    if ((cleanId && seenKonselingIds.has(cleanId)) || seenKonselingKey.has(kKey)) {
      return;
    }
    if (cleanId) seenKonselingIds.add(cleanId);
    seenKonselingKey.add(kKey);

    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    uniqueKonseling.push({
      ...k,
      id: cleanId || ('K-' + Date.now() + Math.random().toString(36).substring(2, 5)),
      nis: cleanNis,
      namaSiswa: student ? student.nama : (k.namaSiswa || ''),
      kelas: student ? student.kelas : (k.kelas || ''),
      tanggal: String(k.tanggal || '').split('T')[0]
    });
  });

  // 7. Filter asesmen (Asesmen Siswa): deduplicate by NIS
  const uniqueAsesmen: AsesmenData[] = [];
  const seenAsesmenNis = new Set<string>();

  (db.asesmen || []).forEach(a => {
    if (!a) return;
    const cleanNis = String(a.nis || '').trim();
    if (!cleanNis || !activeStudentNis.has(cleanNis) || seenAsesmenNis.has(cleanNis)) return;

    seenAsesmenNis.add(cleanNis);
    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    uniqueAsesmen.push({
      ...a,
      id: a.id || ('A-' + cleanNis),
      nis: cleanNis,
      namaSiswa: student ? student.nama : (a.namaSiswa || ''),
      kelas: student ? student.kelas : (a.kelas || '')
    });
  });

  // 8. Filter kunjungan rumah (Home Visit): deduplicate by ID or (nis + tanggalKunjungan)
  const uniqueKunjungan: KunjunganRumahData[] = [];
  const seenKunjunganIds = new Set<string>();
  const seenKunjunganKey = new Set<string>();

  (db.kunjungan || []).forEach(v => {
    if (!v) return;
    const cleanNis = String(v.nis || '').trim();
    const cleanId = String(v.id || '').trim();
    if (!cleanNis || !activeStudentNis.has(cleanNis)) return;

    const vKey = `${cleanNis}_${String(v.tanggalKunjungan || '').split('T')[0]}`;
    if ((cleanId && seenKunjunganIds.has(cleanId)) || seenKunjunganKey.has(vKey)) return;

    if (cleanId) seenKunjunganIds.add(cleanId);
    seenKunjunganKey.add(vKey);

    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    uniqueKunjungan.push({
      ...v,
      id: cleanId || ('V-' + Date.now() + Math.random().toString(36).substring(2, 5)),
      nis: cleanNis,
      namaSiswa: student ? student.nama : (v.namaSiswa || ''),
      kelas: student ? student.kelas : (v.kelas || ''),
      tanggalKunjungan: String(v.tanggalKunjungan || '').split('T')[0]
    });
  });

  // 9. Filter SNBP / Karir: deduplicate by NIS
  const uniqueSnbp: SnbpData[] = [];
  const seenSnbpNis = new Set<string>();

  (db.snbp || []).forEach(sn => {
    if (!sn) return;
    const cleanNis = String(sn.nis || '').trim();
    if (!cleanNis || !activeStudentNis.has(cleanNis) || seenSnbpNis.has(cleanNis)) return;

    seenSnbpNis.add(cleanNis);
    const student = uniqueSiswa.find(s => s.nis === cleanNis);
    uniqueSnbp.push({
      ...sn,
      id: sn.id || ('S-' + cleanNis),
      nis: cleanNis,
      namaSiswa: student ? student.nama : (sn.namaSiswa || ''),
      kelas: student ? student.kelas : (sn.kelas || '')
    });
  });

  return {
    siswa: uniqueSiswa,
    pelanggaran: uniquePelanggaran,
    pencatatan: uniquePencatatan,
    pembinaan: uniquePembinaan,
    kehadiran: uniqueKehadiran,
    konseling: uniqueKonseling,
    asesmen: uniqueAsesmen,
    kunjungan: uniqueKunjungan,
    snbp: uniqueSnbp
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
        pembinaan: initialPembinaan,
        kehadiran: initialKehadiran,
        konseling: initialKonseling,
        asesmen: initialAsesmen,
        kunjungan: initialKunjungan,
        snbp: initialSnbp,
        actionPlans: initialActionPlans
      };

      // If we fell back to a temporary directory (e.g. on Vercel), copy seed file from build workspace if it exists
      if (DATA_STORE_PATH !== path.join(process.cwd(), 'data-store.json')) {
        const localPath = path.join(process.cwd(), 'data-store.json');
        if (fs.existsSync(localPath)) {
          const content = fs.readFileSync(localPath, 'utf-8');
          fs.writeFileSync(DATA_STORE_PATH, content, 'utf-8');
          const parsed = JSON.parse(content);
          if (!parsed.actionPlans) parsed.actionPlans = [];
          return sanitizeAndDeduplicate(parsed);
        }
      }

      fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
      return sanitizeAndDeduplicate(defaultData);
    }
    const rawData = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (!parsed.actionPlans) parsed.actionPlans = [];
    return sanitizeAndDeduplicate(parsed);
  } catch (err) {
    console.error('Error reading DB, using initial data:', err);
    return sanitizeAndDeduplicate({
      siswa: initialSiswa,
      pelanggaran: initialPelanggaran,
      pencatatan: initialPencatatan,
      pembinaan: initialPembinaan,
      kehadiran: initialKehadiran,
      actionPlans: []
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
  const rawUrl = customUrl || process.env.GOOGLE_SCRIPT_URL;
  const scriptUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!scriptUrl) {
    throw new Error('URL Google Apps Script belum dikonfigurasikan.');
  }

  // Handle existing query parameters in GOOGLE_SCRIPT_URL robustly
  const separator = scriptUrl.includes('?') ? '&' : '?';
  let currentUrl = `${scriptUrl}${separator}action=${encodeURIComponent(action)}`;
  let currentMethod: 'GET' | 'POST' = method;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  let requestBody: string | undefined = undefined;
  if (method === 'POST') {
    // Send as text/plain to prevent CORS preflight issues and guarantee GAS e.postData.contents parsing
    headers['Content-Type'] = 'text/plain;charset=utf-8';
    
    // Structure payload with action both at root and inside wrapper
    const payload = {
      action: action,
      data: body !== undefined && body !== null ? body : {}
    };
    requestBody = JSON.stringify(payload);
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
    throw new Error('Google Apps Script tidak merespons.');
  }

  if (!response.ok) {
    throw new Error(`Google Apps Script merespons dengan status error: ${response.status}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    // Check if HTML is returned from Google (e.g. login block, authorization prompt, permission denial)
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      throw new Error(`Google memblokir akses ke Web App skrip. Akun Google Anda (@guru.smp.belajar.id atau domain sekolah) membatasi akses Web App atau izin belum diotorisasi ke 'Siapa Saja' (Anyone). Pastikan deployment diatur ke 'Siapa saja' atau gunakan akun Gmail pribadi.`);
    }
    throw new Error(`Gagal memproses respons dari Google Apps Script: ${text.slice(0, 160)}`);
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
  const rawUrl = (req.body && req.body.googleScriptUrl) || '';
  const googleScriptUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  
  try {
    // 1. Modify env in-memory
    process.env.GOOGLE_SCRIPT_URL = googleScriptUrl;
    
    // 2. Write to the JSON configuration store for 100% reliable multi-device permanent persistence
    try {
      fs.writeFileSync(CONFIG_STORE_PATH, JSON.stringify({ googleScriptUrl }, null, 2), 'utf-8');
      console.log('[Express API] Berhasil menyimpan konfigurasi ke config-settings.json');
    } catch (configErr: any) {
      console.warn('[Express API Alert] Gagal menulis ke config-settings.json:', configErr.message);
    }
    
    // 3. Write/update the .env file if the filesystem is writeable
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      if (envContent.includes('GOOGLE_SCRIPT_URL=')) {
        envContent = envContent.replace(/GOOGLE_SCRIPT_URL=.*/g, `GOOGLE_SCRIPT_URL="${googleScriptUrl}"`);
      } else {
        envContent += `\nGOOGLE_SCRIPT_URL="${googleScriptUrl}"\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (writeErr: any) {
      console.warn('Gagal menulis ke berkas .env:', writeErr.message);
    }

    // 4. If URL is removed / cleared
    if (!googleScriptUrl) {
      return res.json({
        success: true,
        message: 'Konfigurasi Google Apps Script berhasil dinonaktifkan. Aplikasi kembali ke database offline.',
        data: {
          isGoogleScriptConnected: false,
          googleScriptUrl: ''
        }
      });
    }

    // 5. Test initial data pull from Google Sheets
    let pullSuccess = false;
    let pullError = '';
    try {
      console.log('[Auto-Sync] Memulai pengunduhan data awal dari Google Sheets...');
      const [studentRes, violationRes, recordRes, kehadiranRes, konselingRes, asesmenRes, kunjunganRes, snbpRes] = await Promise.all([
        proxyToGoogleScript('getStudents', 'GET', null, googleScriptUrl),
        proxyToGoogleScript('getViolations', 'GET', null, googleScriptUrl),
        proxyToGoogleScript('getRecords', 'GET', null, googleScriptUrl),
        proxyToGoogleScript('getKehadiran', 'GET', null, googleScriptUrl).catch(() => ({ success: false, data: [] })),
        proxyToGoogleScript('getKonseling', 'GET', null, googleScriptUrl).catch(() => ({ success: false, data: [] })),
        proxyToGoogleScript('getAsesmen', 'GET', null, googleScriptUrl).catch(() => ({ success: false, data: [] })),
        proxyToGoogleScript('getKunjungan', 'GET', null, googleScriptUrl).catch(() => ({ success: false, data: [] })),
        proxyToGoogleScript('getSnbp', 'GET', null, googleScriptUrl).catch(() => ({ success: false, data: [] }))
      ]);

      if (studentRes.success && violationRes.success && recordRes.success) {
        const currentDb = readDB();
        const newDb: DBStructure = {
          siswa: (studentRes.data && studentRes.data.length > 0) ? studentRes.data : currentDb.siswa,
          pelanggaran: (violationRes.data && violationRes.data.length > 0) ? violationRes.data : currentDb.pelanggaran,
          pencatatan: recordRes.data?.pencatatan || [],
          pembinaan: recordRes.data?.pembinaan || [],
          kehadiran: (kehadiranRes && kehadiranRes.success && Array.isArray(kehadiranRes.data) && kehadiranRes.data.length > 0) ? kehadiranRes.data : (currentDb.kehadiran || []),
          konseling: (konselingRes && konselingRes.success && Array.isArray(konselingRes.data) && konselingRes.data.length > 0) ? konselingRes.data : (currentDb.konseling || []),
          asesmen: (asesmenRes && asesmenRes.success && Array.isArray(asesmenRes.data) && asesmenRes.data.length > 0) ? asesmenRes.data : (currentDb.asesmen || []),
          kunjungan: (kunjunganRes && kunjunganRes.success && Array.isArray(kunjunganRes.data) && kunjunganRes.data.length > 0) ? kunjunganRes.data : (currentDb.kunjungan || []),
          snbp: (snbpRes && snbpRes.success && Array.isArray(snbpRes.data) && snbpRes.data.length > 0) ? snbpRes.data : (currentDb.snbp || [])
        };
        const sanitized = sanitizeAndDeduplicate(newDb);
        writeDB(sanitized);
        pullSuccess = true;
        console.log('[Auto-Sync] Berhasil mengunduh dan menyinkronkan data Google Sheets!');
      } else {
        pullError = studentRes.message || violationRes.message || recordRes.message || 'Respons Google Sheets mengindikasikan format tidak cocok.';
      }
    } catch (syncErr: any) {
      pullError = syncErr.message;
      console.warn('[Auto-Sync Alert] Gagal melakukan unduhan data awal:', syncErr.message);
    }

    if (!pullSuccess) {
      return res.status(400).json({
        success: false,
        message: `Gagal terhubung ke Google Sheets: ${pullError}`,
        data: {
          isGoogleScriptConnected: true,
          googleScriptUrl
        }
      });
    }

    res.json({
      success: true,
      message: 'Koneksi berhasil dan database Google Sheets telah tersinkronisasi secara permanen!',
      data: {
        isGoogleScriptConnected: true,
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
        const [studentRes, violationRes, recordRes, kehadiranRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET', null, scriptUrl),
          proxyToGoogleScript('getViolations', 'GET', null, scriptUrl),
          proxyToGoogleScript('getRecords', 'GET', null, scriptUrl),
          proxyToGoogleScript('getKehadiran', 'GET', null, scriptUrl).catch(() => ({ success: false, data: [] }))
        ]);

        if (studentRes.success && violationRes.success && recordRes.success) {
          const freshDb: DBStructure = {
            siswa: [...(studentRes.data || []), ...(db.siswa || [])],
            pelanggaran: (violationRes.data && violationRes.data.length > 0) ? violationRes.data : (db.pelanggaran || []),
            pencatatan: recordRes.data?.pencatatan || [],
            pembinaan: recordRes.data?.pembinaan || [],
            kehadiran: (kehadiranRes && kehadiranRes.success && Array.isArray(kehadiranRes.data)) ? kehadiranRes.data : (db.kehadiran || [])
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
    case 'getViolations': {
      const list = (db.pelanggaran && db.pelanggaran.length > 0) ? db.pelanggaran : DEFAULT_MASTER_PELANGGARAN;
      return res.json({ success: true, data: list });
    }
    case 'getRecords':
      return res.json({ 
        success: true, 
        data: {
          pencatatan: db.pencatatan,
          pembinaan: db.pembinaan
        }
      });
    case 'getKehadiran':
      return res.json({ success: true, data: db.kehadiran || [] });
    case 'getKonseling':
      return res.json({ success: true, data: db.konseling || [] });
    case 'getAsesmen':
      return res.json({ success: true, data: db.asesmen || [] });
    case 'getKunjungan':
      return res.json({ success: true, data: db.kunjungan || [] });
    case 'getSnbp':
      return res.json({ success: true, data: db.snbp || [] });
    case 'getActionPlans':
      return res.json({ success: true, data: db.actionPlans || [] });
    case 'getAllData':
      return res.json({ success: true, data: db });
    default:
      return res.status(400).json({ success: false, message: 'Action tidak dikenali atau tidak disupport lewat GET.' });
  }
});

apiRouter.post('/data', async (req, res) => {
  const action = req.query.action as string;
  const body = req.body || {};
  const scriptUrl = (req.headers['x-google-script-url'] as string) || process.env.GOOGLE_SCRIPT_URL || '';

  const db = readDB();

  switch (action) {
    case 'addStudent': {
      const newSiswa: Siswa = {
        id: body.id || 'S' + Math.floor(1000 + Math.random() * 9000),
        nis: String(body.nis || '').trim(),
        nama: String(body.nama || '').trim(),
        kelas: String(body.kelas || '').trim(),
        jk: body.jk || 'L',
        namaOrangTua: body.namaOrangTua || '',
        noHp: body.noHp || '',
        foto: body.foto || ''
      };

      // Check if NIS already exists for addition (only if not an edit/overwrite)
      const existingIdx = db.siswa.findIndex(s => String(s.nis).trim() === newSiswa.nis);
      if (existingIdx !== -1 && !body.id) {
        return res.status(400).json({ success: false, message: 'NIS sudah terdaftar.' });
      }

      if (body.id) {
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

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addStudent', 'POST', newSiswa, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddStudent]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data siswa berhasil disimpan.', data: db.siswa });
    }

    case 'deleteStudent': {
      const studentToDelete = db.siswa.find(s => s.id === body.id || String(s.nis).trim() === String(body.nis || '').trim());
      
      db.siswa = db.siswa.filter(s => s.id !== body.id && (!body.nis || String(s.nis).trim() !== String(body.nis).trim()));
      if (studentToDelete) {
        db.pencatatan = db.pencatatan.filter(r => String(r.nis).trim() !== String(studentToDelete.nis).trim());
        db.pembinaan = db.pembinaan.filter(p => String(p.nis).trim() !== String(studentToDelete.nis).trim());
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteStudent', 'POST', { id: body.id, nis: studentToDelete?.nis }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write DeleteStudent]:', err.message);
        }
      }

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

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addViolation', 'POST', newViolation, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddViolation]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Jenis pelanggaran berhasil disimpan.', data: db.pelanggaran });
    }

    case 'deleteViolation': {
      db.pelanggaran = db.pelanggaran.filter(v => v.id !== body.id);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteViolation', 'POST', { id: body.id, kode: body.kode }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write DeleteViolation]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Jenis pelanggaran berhasil dihapus.', data: db.pelanggaran });
    }

    case 'addRecord': {
      // Find student and violation details to fill points and full info
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const namaSiswa = body.namaSiswa || (student ? student.nama : 'Siswa');
      const kelas = body.kelas || (student ? student.kelas : '-');

      const violationMaster = db.pelanggaran.find(v => v.namaPelanggaran === body.pelanggaran);
      const points = body.poin !== undefined ? parseInt(body.poin, 10) : (violationMaster ? violationMaster.poin : 0);
      const kodePel = body.kode || (violationMaster ? violationMaster.kode : '');

      const newRecord: Pencatatan = {
        id: body.id || 'R' + Date.now() + Math.floor(Math.random() * 1000),
        tanggal: body.tanggal || new Date().toISOString().split('T')[0],
        nis: String(body.nis || '').trim(),
        namaSiswa,
        kelas,
        pelanggaran: body.pelanggaran,
        poin: points,
        petugas: body.petugas || 'Petugas BK',
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
      let updatedDb = recalculatePembinaan(newRecord.nis, db, newRecord.tanggal);
      writeDB(updatedDb);

      if (scriptUrl) {
        try {
          console.log(`[Sync Write AddRecord] Mengirim data ke Google Sheets...`, newRecord);
          await proxyToGoogleScript('addRecord', 'POST', {
            ...newRecord,
            kode: kodePel
          }, scriptUrl);
          console.log(`[Sync Write AddRecord] Berhasil tersimpan ke Google Sheets.`);
        } catch (err: any) {
          console.warn(`[Sync Write AddRecord Alert] Gagal menulis ke Google Sheets:`, err.message);
        }
      }

      return res.json({ 
        success: true, 
        message: 'Pelanggaran siswa berhasil dicatat.', 
        data: {
          pencatatan: updatedDb.pencatatan,
          pembinaan: updatedDb.pembinaan
        } 
      });
    }

    case 'deleteRecord': {
      const record = db.pencatatan.find(r => r.id === body.id);
      db.pencatatan = db.pencatatan.filter(r => r.id !== body.id);

      // Recalculate pembinaan for this student since their records changed
      let updatedDb = record ? recalculatePembinaan(record.nis, db, new Date().toISOString().split('T')[0]) : db;
      writeDB(updatedDb);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteRecord', 'POST', { id: body.id, nis: record?.nis }, scriptUrl);
        } catch (err: any) {
          console.warn(`[Sync DeleteRecord Alert]:`, err.message);
        }
      }

      return res.json({ 
        success: true, 
        message: 'Pencatatan pelanggaran berhasil dihapus.', 
        data: {
          pencatatan: updatedDb.pencatatan,
          pembinaan: updatedDb.pembinaan
        } 
      });
    }

    case 'addKehadiran': {
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const namaSiswa = body.namaSiswa || (student ? student.nama : '');
      const kelas = body.kelas || (student ? student.kelas : '');

      const hadir = Number(body.hadir || 0);
      const sakit = Number(body.sakit || 0);
      const izin = Number(body.izin || 0);
      const alfa = Number(body.alfa || 0);
      const jumlah = body.jumlah !== undefined ? Number(body.jumlah) : (hadir + sakit + izin + alfa);
      const status = body.status || (hadir > 0 ? 'Hadir' : (sakit > 0 ? 'Sakit' : (izin > 0 ? 'Izin' : 'Alfa')));

      const newKehadiran: KehadiranData = {
        id: body.id || 'H-' + Date.now(),
        nis: String(body.nis || '').trim(),
        namaSiswa,
        kelas,
        mingguKe: String(body.mingguKe || '1'),
        bulan: String(body.bulan || 'Januari'),
        tahun: String(body.tahun || new Date().getFullYear()),
        hadir,
        sakit,
        izin,
        alfa,
        jumlah,
        status,
        keterangan: body.keterangan || ''
      };

      if (!db.kehadiran) db.kehadiran = [];

      // Check if existing record by ID or by composite (NIS + mingguKe + bulan + tahun)
      const existingIdx = db.kehadiran.findIndex(h => 
        (body.id && h.id === body.id) || 
        (h.nis === newKehadiran.nis && h.mingguKe === newKehadiran.mingguKe && h.bulan === newKehadiran.bulan && h.tahun === newKehadiran.tahun)
      );

      if (existingIdx !== -1) {
        db.kehadiran[existingIdx] = { ...db.kehadiran[existingIdx], ...newKehadiran };
      } else {
        db.kehadiran.unshift(newKehadiran);
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addKehadiran', 'POST', newKehadiran, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddKehadiran]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Rekap kehadiran berhasil disimpan.', data: db.kehadiran });
    }

    case 'deleteKehadiran': {
      if (!db.kehadiran) db.kehadiran = [];
      db.kehadiran = db.kehadiran.filter(h => h.id !== body.id);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteKehadiran', 'POST', { id: body.id }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync DeleteKehadiran]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Rekap kehadiran berhasil dihapus.', data: db.kehadiran });
    }

    case 'addKonseling': {
      if (!db.konseling) db.konseling = [];
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const id = body.id || ('K-' + Date.now());
      const newKonseling: KonselingData = {
        id,
        nis: String(body.nis || '').trim(),
        namaSiswa: body.namaSiswa || (student ? student.nama : ''),
        kelas: body.kelas || (student ? student.kelas : ''),
        jenisKonseling: body.jenisKonseling || 'Individu',
        tanggal: (body.tanggal || new Date().toISOString()).split('T')[0],
        permasalahanUtama: body.permasalahanUtama || '',
        analisisBK: body.analisisBK || '',
        solusiRekomendasi: body.solusiRekomendasi || '',
        hasilEvaluasi: body.hasilEvaluasi || '',
        tindakLanjut: body.tindakLanjut || '',
        petugas: body.petugas || ''
      };

      const existingIdx = db.konseling.findIndex(k => k.id === id);
      if (existingIdx !== -1) {
        db.konseling[existingIdx] = newKonseling;
      } else {
        db.konseling.unshift(newKonseling);
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addKonseling', 'POST', newKonseling, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddKonseling]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data konseling berhasil disimpan.', data: db.konseling });
    }

    case 'deleteKonseling': {
      if (!db.konseling) db.konseling = [];
      db.konseling = db.konseling.filter(k => k.id !== body.id);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteKonseling', 'POST', { id: body.id }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync DeleteKonseling]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data konseling berhasil dihapus.', data: db.konseling });
    }

    case 'addAsesmen': {
      if (!db.asesmen) db.asesmen = [];
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const id = body.id || ('A-' + (body.nis || Date.now()));
      const newAsesmen: AsesmenData = {
        id,
        nis: String(body.nis || '').trim(),
        namaSiswa: body.namaSiswa || (student ? student.nama : ''),
        kelas: body.kelas || (student ? student.kelas : ''),
        hasilAKPD: body.hasilAKPD || '',
        gayaBelajar: body.gayaBelajar || '',
        aum: body.aum || '',
        psikotes: body.psikotes || '',
        minatBakat: body.minatBakat || ''
      };

      const existingIdx = db.asesmen.findIndex(a => a.id === id || a.nis === body.nis);
      if (existingIdx !== -1) {
        db.asesmen[existingIdx] = newAsesmen;
      } else {
        db.asesmen.unshift(newAsesmen);
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addAsesmen', 'POST', newAsesmen, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddAsesmen]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data asesmen berhasil disimpan.', data: db.asesmen });
    }

    case 'deleteAsesmen': {
      if (!db.asesmen) db.asesmen = [];
      db.asesmen = db.asesmen.filter(a => a.id !== body.id && a.nis !== body.nis);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteAsesmen', 'POST', { id: body.id, nis: body.nis }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync DeleteAsesmen]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data asesmen berhasil dihapus.', data: db.asesmen });
    }

    case 'addKunjungan': {
      if (!db.kunjungan) db.kunjungan = [];
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const id = body.id || ('V-' + Date.now());
      const newKunjungan: KunjunganRumahData = {
        id,
        nis: String(body.nis || '').trim(),
        namaSiswa: body.namaSiswa || (student ? student.nama : ''),
        kelas: body.kelas || (student ? student.kelas : ''),
        tanggalKunjungan: (body.tanggalKunjungan || new Date().toISOString()).split('T')[0],
        tujuanKunjungan: body.tujuanKunjungan || '',
        hasilTemuan: body.hasilTemuan || '',
        petugas: body.petugas || ''
      };

      const existingIdx = db.kunjungan.findIndex(v => v.id === id);
      if (existingIdx !== -1) {
        db.kunjungan[existingIdx] = newKunjungan;
      } else {
        db.kunjungan.unshift(newKunjungan);
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addKunjungan', 'POST', newKunjungan, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddKunjungan]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data kunjungan rumah berhasil disimpan.', data: db.kunjungan });
    }

    case 'deleteKunjungan': {
      if (!db.kunjungan) db.kunjungan = [];
      db.kunjungan = db.kunjungan.filter(v => v.id !== body.id);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteKunjungan', 'POST', { id: body.id }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync DeleteKunjungan]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data kunjungan rumah berhasil dihapus.', data: db.kunjungan });
    }

    case 'addSnbp': {
      if (!db.snbp) db.snbp = [];
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis || '').trim());
      const id = body.id || ('S-' + (body.nis || Date.now()));
      const newSnbp: SnbpData = {
        id,
        nis: String(body.nis || '').trim(),
        namaSiswa: body.namaSiswa || (student ? student.nama : ''),
        kelas: body.kelas || (student ? student.kelas : ''),
        namaUniversitas: body.namaUniversitas || '',
        programStudi: body.programStudi || '',
        keteranganLulus: body.keteranganLulus || 'Lulus',
        tahun: body.tahun || new Date().getFullYear().toString(),
        catatan: body.catatan || ''
      };

      const existingIdx = db.snbp.findIndex(sn => sn.id === id || sn.nis === body.nis);
      if (existingIdx !== -1) {
        db.snbp[existingIdx] = newSnbp;
      } else {
        db.snbp.unshift(newSnbp);
      }

      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('addSnbp', 'POST', newSnbp, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync Write AddSnbp]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data SNBP/Karir berhasil disimpan.', data: db.snbp });
    }

    case 'deleteSnbp': {
      if (!db.snbp) db.snbp = [];
      db.snbp = db.snbp.filter(sn => sn.id !== body.id && sn.nis !== body.nis);
      writeDB(db);

      if (scriptUrl) {
        try {
          await proxyToGoogleScript('deleteSnbp', 'POST', { id: body.id, nis: body.nis }, scriptUrl);
        } catch (err: any) {
          console.warn('[Sync DeleteSnbp]:', err.message);
        }
      }

      return res.json({ success: true, message: 'Data SNBP/Karir berhasil dihapus.', data: db.snbp });
    }

    case 'addActionPlan': {
      if (!db.actionPlans) db.actionPlans = [];
      const student = db.siswa.find(s => String(s.nis).trim() === String(body.nis).trim());
      const newPlan: ActionPlan = {
        id: body.id || 'AP_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        nis: String(body.nis || '').trim(),
        namaSiswa: body.namaSiswa || (student ? student.nama : ''),
        kelas: body.kelas || (student ? student.kelas : ''),
        judulTarget: body.judulTarget || 'Target Pembinaan Karakter',
        kategoriTarget: body.kategoriTarget || 'Kedisiplinan',
        deskripsiRencana: body.deskripsiRencana || '',
        indikatorKeberhasilan: body.indikatorKeberhasilan || '',
        tenggatWaktu: body.tenggatWaktu || '',
        tanggalDibuat: body.tanggalDibuat || new Date().toISOString().split('T')[0],
        status: body.status || 'Direncanakan',
        poinTargetPengurangan: Number(body.poinTargetPengurangan) || 0,
        pembimbing: body.pembimbing || 'Guru BK',
        catatanEvaluasi: body.catatanEvaluasi || '',
        tanggalEvaluasiTerakhir: body.tanggalEvaluasiTerakhir || ''
      };

      db.actionPlans.unshift(newPlan);
      writeDB(db);
      return res.json({ success: true, message: 'Rencana tindak lanjut (Action Plan) berhasil ditambahkan.', data: db.actionPlans });
    }

    case 'updateActionPlan': {
      if (!db.actionPlans) db.actionPlans = [];
      const idx = db.actionPlans.findIndex(p => p.id === body.id);
      if (idx !== -1) {
        db.actionPlans[idx] = {
          ...db.actionPlans[idx],
          ...body,
          tanggalEvaluasiTerakhir: new Date().toISOString().split('T')[0]
        };
        writeDB(db);
        return res.json({ success: true, message: 'Action Plan berhasil diperbarui.', data: db.actionPlans });
      }
      return res.status(404).json({ success: false, message: 'Action Plan tidak ditemukan.' });
    }

    case 'deleteActionPlan': {
      if (!db.actionPlans) db.actionPlans = [];
      db.actionPlans = db.actionPlans.filter(p => p.id !== body.id);
      writeDB(db);
      return res.json({ success: true, message: 'Action Plan berhasil dihapus.', data: db.actionPlans });
    }

    case 'syncPull': {
      if (!process.env.GOOGLE_SCRIPT_URL) {
        return res.status(400).json({ success: false, message: 'Google Sheets belum terhubung.' });
      }
      try {
        // Fetch all data from Google Sheets in parallel to improve synchronization performance
        const [studentRes, violationRes, recordRes, kehadiranRes, konselingRes, asesmenRes, kunjunganRes, snbpRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET'),
          proxyToGoogleScript('getViolations', 'GET'),
          proxyToGoogleScript('getRecords', 'GET'),
          proxyToGoogleScript('getKehadiran', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getKonseling', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getAsesmen', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getKunjungan', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getSnbp', 'GET').catch(() => ({ success: false, data: [] }))
        ]);

        if (!studentRes.success || !violationRes.success || !recordRes.success) {
          return res.status(500).json({ success: false, message: 'Gagal mengambil data dari Google Sheet.' });
        }

        const localDb = readDB();
        const newDb: DBStructure = {
          siswa: (studentRes.data && studentRes.data.length > 0) ? studentRes.data : (localDb.siswa || []),
          pelanggaran: (violationRes.data && violationRes.data.length > 0) ? violationRes.data : (localDb.pelanggaran || []),
          pencatatan: recordRes.data?.pencatatan || [],
          pembinaan: recordRes.data?.pembinaan || [],
          kehadiran: (kehadiranRes && kehadiranRes.success && Array.isArray(kehadiranRes.data)) ? kehadiranRes.data : (localDb.kehadiran || []),
          konseling: (konselingRes && konselingRes.success && Array.isArray(konselingRes.data)) ? konselingRes.data : (localDb.konseling || []),
          asesmen: (asesmenRes && asesmenRes.success && Array.isArray(asesmenRes.data)) ? asesmenRes.data : (localDb.asesmen || []),
          kunjungan: (kunjunganRes && kunjunganRes.success && Array.isArray(kunjunganRes.data)) ? kunjunganRes.data : (localDb.kunjungan || []),
          snbp: (snbpRes && snbpRes.success && Array.isArray(snbpRes.data)) ? snbpRes.data : (localDb.snbp || [])
        };

        const sanitized = sanitizeAndDeduplicate(newDb);
        writeDB(sanitized);
        return res.json({ 
          success: true, 
          message: `Berhasil menarik ${sanitized.siswa.length} data siswa, riwayat pelanggaran, dan layanan BK dari Google Sheet ke aplikasi.`, 
          data: sanitized 
        });
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
        return res.json({ success: true, message: 'Berhasil mengirim semua data aplikasi (Siswa, Pelanggaran, dan Layanan BK) ke Google Sheet.' });
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
        
        // Fetch all data from Google Sheet in parallel
        const [studentRes, violationRes, recordRes, kehadiranRes, konselingRes, asesmenRes, kunjunganRes, snbpRes] = await Promise.all([
          proxyToGoogleScript('getStudents', 'GET'),
          proxyToGoogleScript('getViolations', 'GET'),
          proxyToGoogleScript('getRecords', 'GET'),
          proxyToGoogleScript('getKehadiran', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getKonseling', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getAsesmen', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getKunjungan', 'GET').catch(() => ({ success: false, data: [] })),
          proxyToGoogleScript('getSnbp', 'GET').catch(() => ({ success: false, data: [] }))
        ]);

        if (!studentRes.success || !violationRes.success || !recordRes.success) {
          return res.status(500).json({ success: false, message: 'Gagal mengambil data dari Google Sheet untuk sinkronisasi.' });
        }

        const sheetSiswa: Siswa[] = studentRes.data || [];
        const sheetPelanggaran: Pelanggaran[] = violationRes.data || [];
        const sheetPencatatan: Pencatatan[] = recordRes.data?.pencatatan || [];
        const sheetPembinaan: Pembinaan[] = recordRes.data?.pembinaan || [];
        const sheetKehadiran: KehadiranData[] = (kehadiranRes && kehadiranRes.success && Array.isArray(kehadiranRes.data)) ? kehadiranRes.data : [];
        const sheetKonseling: KonselingData[] = (konselingRes && konselingRes.success && Array.isArray(konselingRes.data)) ? konselingRes.data : [];
        const sheetAsesmen: AsesmenData[] = (asesmenRes && asesmenRes.success && Array.isArray(asesmenRes.data)) ? asesmenRes.data : [];
        const sheetKunjungan: KunjunganRumahData[] = (kunjunganRes && kunjunganRes.success && Array.isArray(kunjunganRes.data)) ? kunjunganRes.data : [];
        const sheetSnbp: SnbpData[] = (snbpRes && snbpRes.success && Array.isArray(snbpRes.data)) ? snbpRes.data : [];

        // Combine all lists and run sanitizeAndDeduplicate for perfect data integrity
        const rawMergedDb: DBStructure = {
          siswa: [...(localDb.siswa || []), ...sheetSiswa],
          pelanggaran: [...(localDb.pelanggaran || []), ...sheetPelanggaran],
          pencatatan: [...(localDb.pencatatan || []), ...sheetPencatatan],
          pembinaan: [...(localDb.pembinaan || []), ...sheetPembinaan],
          kehadiran: [...(localDb.kehadiran || []), ...sheetKehadiran],
          konseling: [...(localDb.konseling || []), ...sheetKonseling],
          asesmen: [...(localDb.asesmen || []), ...sheetAsesmen],
          kunjungan: [...(localDb.kunjungan || []), ...sheetKunjungan],
          snbp: [...(localDb.snbp || []), ...sheetSnbp]
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
          message: 'Sinkronisasi dua arah berhasil! Semua data (Siswa, Pelanggaran, Pembinaan, Kehadiran, dan Layanan BK) di aplikasi dan Google Sheet sekarang telah digabungkan secara permanen.', 
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
