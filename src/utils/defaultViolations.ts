import { Pelanggaran } from '../types';

export const DEFAULT_MASTER_PELANGGARAN: Pelanggaran[] = [
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
