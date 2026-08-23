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
