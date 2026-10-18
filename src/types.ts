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
  tanggal: string; // ISO string YYYY-MM-DD
  nis: string;
  namaSiswa: string;
  kelas: string;
  pelanggaran: string; // nama pelanggaran
  poin: number;
  petugas: string;
  keterangan: string;
  foto?: string; // Base64 string of incident or student photo
}

export interface Pembinaan {
  id: string;
  nis: string;
  namaSiswa: string;
  totalPoin: number;
  tindakan: string;
  tanggal: string;
}

export type ActionPlanStatus = 'Direncanakan' | 'Sedang Berjalan' | 'Tercapai' | 'Perlu Evaluasi Ulang';
export type ActionPlanKategori = 'Kedisiplinan' | 'Akademik' | 'Kerapian' | 'Etika & Sikap' | 'Sosial & Emosi';

export interface ActionPlan {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  judulTarget: string;
  kategoriTarget: ActionPlanKategori;
  deskripsiRencana: string;
  indikatorKeberhasilan: string;
  tenggatWaktu: string; // YYYY-MM-DD
  tanggalDibuat: string; // YYYY-MM-DD
  status: ActionPlanStatus;
  poinTargetPengurangan?: number; // Target pengurangan/pemulihan poin jika berhasil
  pembimbing: string; // Nama Guru BK / Wali Kelas
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
  kelasAjar?: string; // Khusus Guru Piket / Wali Kelas jika ingin difilter
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
