import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles, 
  Clipboard, 
  Home, 
  CheckSquare, 
  FileCheck,
  TrendingUp,
  Award,
  BookMarked,
  Layers,
  Search,
  X,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Siswa } from '../types';

interface LayananBKProps {
  siswa: Siswa[];
  classNameFilter: string; // school name like "SMP NUSANTARA PLUS", etc.
  currentUser: { nama: string; role: string };
}

// Interfaces for BK Data Structures
interface KonselingData {
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
}

interface AsesmenData {
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

interface KunjunganRumahData {
  id: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  tanggalKunjungan: string;
  tujuanKunjungan: string;
  hasilTemuan: string;
}

interface KehadiranData {
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

interface SnbpData {
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

interface SearchableSiswaSelectProps {
  students: Siswa[];
  selectedValue: string;
  onChange: (nis: string) => void;
  placeholder?: string;
}

function SearchableSiswaSelect({ students, selectedValue, onChange, placeholder = "Cari siswa..." }: SearchableSiswaSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedStudent = students.find(s => s.nis === selectedValue);

  // Auto-clear search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filtered = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.nama.toLowerCase().includes(q) ||
      s.nis.includes(q) ||
      s.kelas.toLowerCase().includes(q)
    );
  });

  // Use the selected student's details as the value when closed, so it's fully visible and high contrast.
  // When open, show the search query that the user is typing.
  const displayValue = isOpen ? searchQuery : (selectedStudent ? `${selectedStudent.nama} (${selectedStudent.kelas})` : '');

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <input
          type="text"
          placeholder={selectedStudent ? `${selectedStudent.nama} (${selectedStudent.kelas})` : placeholder}
          value={displayValue}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            if (selectedValue) {
              onChange('');
            }
          }}
          className={`pl-9 pr-14 py-2.5 w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold transition-all text-xs text-slate-800 shadow-sm ${selectedStudent ? 'border-indigo-300 bg-indigo-50/10' : ''}`}
        />
        <div className="absolute right-3 flex items-center gap-1 z-10">
          {(selectedValue || searchQuery) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchQuery('');
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 hover:bg-slate-100 rounded-md transition-colors"
              title="Bersihkan pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 italic text-[11px]">Siswa tidak ditemukan.</div>
          ) : (
            filtered.slice(0, 50).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.nis);
                  setIsOpen(false);
                }}
                className="w-full p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-[11px] transition-all text-left border-none focus:bg-slate-50 outline-none"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-xs">{s.nama}</span>
                  <span className="text-slate-500 font-semibold text-[10px] mt-0.5">NIS: {s.nis} | Kelas: {s.kelas}</span>
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-[9px] uppercase font-mono tracking-wider shrink-0">Pilih</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function LayananBK({ siswa, classNameFilter, currentUser }: LayananBKProps) {
  const [activeTab, setActiveTab] = useState<'konseling' | 'asesmen' | 'kunjungan' | 'kehadiran' | 'surat' | 'snbp'>('konseling');

  // Helper to resolve attendance counts for backwards compatibility
  const getRecordCounts = (item: KehadiranData) => {
    const hadir = item.hadir !== undefined ? item.hadir : (item.status === 'Hadir' ? 5 : 0);
    const sakit = item.sakit !== undefined ? item.sakit : (item.status === 'Sakit' ? 1 : 0);
    const izin = item.izin !== undefined ? item.izin : (item.status === 'Izin' ? 1 : 0);
    const alfa = item.alfa !== undefined ? item.alfa : (item.status === 'Alfa' ? 1 : 0);
    const jumlah = item.jumlah !== undefined ? item.jumlah : (hadir + sakit + izin + alfa);
    return { hadir, sakit, izin, alfa, jumlah };
  };

  // Filter students to this school's students
  const belongsToSchool = (studentKelas: string, schoolFilter: string): boolean => {
    if (!studentKelas) return false;
    const k = studentKelas.toUpperCase().trim();
    const sf = schoolFilter.toUpperCase().trim();
    
    if (k === sf) return true;
    
    if (sf === 'SMP NUSANTARA PLUS') {
      if (k.includes('SMP')) return true;
      // Match 7, 8, 9 or VII, VIII, IX (not followed by digits to prevent matching 10, 11, 12)
      const isSmpGrade = /^(7|8|9|VII|VIII|IX)(?![0-9])/i.test(k);
      if (isSmpGrade && !k.includes('SMA') && !k.includes('SMK')) return true;
      const defaultSmpClasses = ['7-A', '7-C', '8-A', '8-B', '9-A', '9-B'];
      if (defaultSmpClasses.some(c => k.includes(c) || k.replace(/[- ]/g, '').includes(c.replace(/[- ]/g, '')))) return true;
    }
    
    if (sf === 'SMA NUSANTARA PLUS') {
      if (k.includes('SMA') || k.includes('IPA') || k.includes('IPS') || k.includes('MIPA')) {
        if (!k.includes('SMK')) return true;
      }
      // Match 10, 11, 12 or X, XI, XII
      const isSmaGrade = /^(10|11|12|X|XI|XII)(?![A-Z]*\b(SMK|SMP|KESEHATAN|TKJ|RPL|FARMASI|KEPERAWATAN|FAR|PERAWAT))/i.test(k);
      if (isSmaGrade && !k.includes('SMP') && !k.includes('SMK') && !k.includes('KESEHATAN') && !k.includes('TKJ') && !k.includes('RPL') && !k.includes('FARMASI')) return true;
    }
    
    if (sf === 'SMK NUSANTARA 1') {
      if (k.includes('SMK 1') || k.includes('SMK NUSANTARA 1')) return true;
      const isSmkMajor = k.includes('TKJ') || k.includes('RPL') || k.includes('MM') || k.includes('OTKP') || k.includes('AKL') || k.includes('BDP');
      if (isSmkMajor && !k.includes('KESEHATAN') && !k.includes('SMK 2')) return true;
      if (k.includes('SMK') && !k.includes('SMK 2') && !k.includes('KESEHATAN')) return true;
    }
    
    if (sf === 'SMK 2 KESEHATAN') {
      if (k.includes('SMK 2') || k.includes('KESEHATAN') || k.includes('FARMASI') || k.includes('KEPERAWATAN') || k.includes('FAR') || k.includes('PERAWAT')) return true;
    }
    
    return false;
  };

  const filteredSchoolStudents = siswa.filter(s => belongsToSchool(s.kelas, classNameFilter));
  const schoolStudents = filteredSchoolStudents.length > 0 ? filteredSchoolStudents : siswa;

  // --- States for each BK sub-feature ---
  const [konselingList, setKonselingList] = useState<KonselingData[]>([]);
  const [asesmenList, setAsesmenList] = useState<AsesmenData[]>([]);
  const [kunjunganList, setKunjunganList] = useState<KunjunganRumahData[]>([]);
  const [kehadiranList, setKehadiranList] = useState<KehadiranData[]>([]);
  const [snbpList, setSnbpList] = useState<SnbpData[]>([]);
  const [searchKehadiranQuery, setSearchKehadiranQuery] = useState('');

  // Toast notifier
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load initial datasets from localStorage
  useEffect(() => {
    const storedKonseling = localStorage.getItem(`bk_konseling_${classNameFilter}`);
    const storedAsesmen = localStorage.getItem(`bk_asesmen_${classNameFilter}`);
    const storedKunjungan = localStorage.getItem(`bk_kunjungan_${classNameFilter}`);
    const storedKehadiran = localStorage.getItem(`bk_kehadiran_${classNameFilter}`);
    const storedSnbp = localStorage.getItem(`bk_snbp_${classNameFilter}`);

    if (storedKonseling) setKonselingList(JSON.parse(storedKonseling));
    else setKonselingList([]);

    if (storedAsesmen) setAsesmenList(JSON.parse(storedAsesmen));
    else setAsesmenList([]);

    if (storedKunjungan) setKunjunganList(JSON.parse(storedKunjungan));
    else setKunjunganList([]);

    if (storedKehadiran) setKehadiranList(JSON.parse(storedKehadiran));
    else setKehadiranList([]);

    if (storedSnbp) setSnbpList(JSON.parse(storedSnbp));
    else setSnbpList([]);

    setSearchKehadiranQuery('');

    // Reset forms to prevent cross-school student data bleed
    setFormKonseling({
      nis: '',
      jenisKonseling: 'Individu',
      tanggal: new Date().toISOString().split('T')[0],
      permasalahanUtama: '',
      analisisBK: '',
      solusiRekomendasi: '',
      hasilEvaluasi: '',
      tindakLanjut: ''
    });

    setFormAsesmen({
      nis: '',
      hasilAKPD: '',
      gayaBelajar: '',
      aum: '',
      psikotes: '',
      minatBakat: ''
    });

    setFormKunjungan({
      nis: '',
      tanggalKunjungan: new Date().toISOString().split('T')[0],
      tujuanKunjungan: '',
      hasilTemuan: ''
    });

    setFormKehadiran({
      nis: '',
      mingguKe: 'Minggu 1',
      bulan: 'Januari',
      tahun: '2026',
      hadir: 5,
      sakit: 0,
      izin: 0,
      alfa: 0,
      keterangan: ''
    });

    setFormSurat({
      nis: '',
      jenisSurat: 'Surat Panggilan',
      nomorSurat: '023/BK-NP/VII/2026',
      perihal: 'Pemanggilan Orang Tua / Koordinasi Perilaku'
    });

    setFormSnbp({
      nis: '',
      namaUniversitas: '',
      programStudi: '',
      keteranganLulus: 'Lulus',
      tahun: new Date().getFullYear().toString(),
      catatan: ''
    });
  }, [classNameFilter]);

  // Save helpers
  const saveKonseling = (list: KonselingData[]) => {
    setKonselingList(list);
    localStorage.setItem(`bk_konseling_${classNameFilter}`, JSON.stringify(list));
  };
  const saveAsesmen = (list: AsesmenData[]) => {
    setAsesmenList(list);
    localStorage.setItem(`bk_asesmen_${classNameFilter}`, JSON.stringify(list));
  };
  const saveKunjungan = (list: KunjunganRumahData[]) => {
    setKunjunganList(list);
    localStorage.setItem(`bk_kunjungan_${classNameFilter}`, JSON.stringify(list));
  };
  const saveKehadiran = (list: KehadiranData[]) => {
    setKehadiranList(list);
    localStorage.setItem(`bk_kehadiran_${classNameFilter}`, JSON.stringify(list));
  };
  const saveSnbp = (list: SnbpData[]) => {
    setSnbpList(list);
    localStorage.setItem(`bk_snbp_${classNameFilter}`, JSON.stringify(list));
  };

  // ------------------ 1. SUB-FITUR: KONSELING SISWA ------------------
  const [formKonseling, setFormKonseling] = useState({
    nis: '',
    jenisKonseling: 'Individu' as 'Individu' | 'Kelompok' | 'Klasikal',
    tanggal: new Date().toISOString().split('T')[0],
    permasalahanUtama: '',
    analisisBK: '',
    solusiRekomendasi: '',
    hasilEvaluasi: '',
    tindakLanjut: ''
  });

  const handleAddKonseling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKonseling.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formKonseling.nis);
    if (!studentObj) return;

    const newKonseling: KonselingData = {
      id: 'K-' + Date.now(),
      nis: formKonseling.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      jenisKonseling: formKonseling.jenisKonseling,
      tanggal: formKonseling.tanggal,
      permasalahanUtama: formKonseling.permasalahanUtama,
      analisisBK: formKonseling.analisisBK,
      solusiRekomendasi: formKonseling.solusiRekomendasi,
      hasilEvaluasi: formKonseling.hasilEvaluasi,
      tindakLanjut: formKonseling.tindakLanjut
    };

    saveKonseling([newKonseling, ...konselingList]);
    showLocalToast('Berhasil menambahkan catatan konseling siswa.');
    // Reset
    setFormKonseling({
      nis: '',
      jenisKonseling: 'Individu',
      tanggal: new Date().toISOString().split('T')[0],
      permasalahanUtama: '',
      analisisBK: '',
      solusiRekomendasi: '',
      hasilEvaluasi: '',
      tindakLanjut: ''
    });
  };

  const handleDeleteKonseling = (id: string) => {
    const updated = konselingList.filter(item => item.id !== id);
    saveKonseling(updated);
    showLocalToast('Catatan konseling berhasil dihapus.', 'success');
  };

  // ------------------ 2. SUB-FITUR: ASESMEN BK ------------------
  const [formAsesmen, setFormAsesmen] = useState({
    nis: '',
    hasilAKPD: '',
    gayaBelajar: '',
    aum: '',
    psikotes: '',
    minatBakat: ''
  });

  const handleAddAsesmen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsesmen.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formAsesmen.nis);
    if (!studentObj) return;

    // Check if assessment already exists for student, if so we update or replace
    const filtered = asesmenList.filter(item => item.nis !== formAsesmen.nis);

    const newAsesmen: AsesmenData = {
      id: 'A-' + Date.now(),
      nis: formAsesmen.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      hasilAKPD: formAsesmen.hasilAKPD,
      gayaBelajar: formAsesmen.gayaBelajar,
      aum: formAsesmen.aum,
      psikotes: formAsesmen.psikotes,
      minatBakat: formAsesmen.minatBakat
    };

    saveAsesmen([newAsesmen, ...filtered]);
    showLocalToast('Berhasil menyimpan data asesmen BK siswa.');
    // Reset
    setFormAsesmen({
      nis: '',
      hasilAKPD: '',
      gayaBelajar: '',
      aum: '',
      psikotes: '',
      minatBakat: ''
    });
  };

  const handleDeleteAsesmen = (id: string) => {
    const updated = asesmenList.filter(item => item.id !== id);
    saveAsesmen(updated);
    showLocalToast('Data asesmen kesiswaan berhasil dihapus.');
  };

  // ------------------ 3. SUB-FITUR: KUNJUNGAN RUMAH ------------------
  const [formKunjungan, setFormKunjungan] = useState({
    nis: '',
    tanggalKunjungan: new Date().toISOString().split('T')[0],
    tujuanKunjungan: '',
    hasilTemuan: ''
  });

  const handleAddKunjungan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKunjungan.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formKunjungan.nis);
    if (!studentObj) return;

    const newKunjungan: KunjunganRumahData = {
      id: 'V-' + Date.now(),
      nis: formKunjungan.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      tanggalKunjungan: formKunjungan.tanggalKunjungan,
      tujuanKunjungan: formKunjungan.tujuanKunjungan,
      hasilTemuan: formKunjungan.hasilTemuan
    };

    saveKunjungan([newKunjungan, ...kunjunganList]);
    showLocalToast('Catatan kunjungan rumah (home visit) berhasil disimpan.');
    setFormKunjungan({
      nis: '',
      tanggalKunjungan: new Date().toISOString().split('T')[0],
      tujuanKunjungan: '',
      hasilTemuan: ''
    });
  };

  const handleDeleteKunjungan = (id: string) => {
    const updated = kunjunganList.filter(item => item.id !== id);
    saveKunjungan(updated);
    showLocalToast('Catatan kunjungan rumah berhasil dihapus.');
  };

  // Helper helper to generate Word .doc file
  const downloadWordDoc = (filename: string, htmlContent: string) => {
    const header = `<html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <title>Dokumen Layanan BK</title>
            <style>
              @page {
                size: A4;
                margin: 2cm 2cm 2cm 2cm;
              }
              body { font-family: 'Times New Roman', serif; line-height: 1.25; color: #000; margin: 0; }
              p { margin: 0 0 8px 0; font-size: 11pt; text-align: justify; }
              .kop-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; }
              .kop-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; }
              .kop-sub { font-size: 10pt; margin: 2px 0 0 0; }
              .doc-title { text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 15px; text-transform: uppercase; }
              .meta-table { width: 100%; margin-bottom: 15px; border-collapse: collapse; }
              .meta-table td { padding: 3px 0; font-size: 11pt; vertical-align: top; }
              .section-title { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 2px; }
              .signature-block { width: 100%; margin-top: 35px; }
              .signature-block td { text-align: center; width: 50%; font-size: 11pt; }
            </style>
          </head>
          <body>`;
    const footer = `</body></html>`;
    const fullHtml = header + htmlContent + footer;

    const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportKunjunganWord = (item: KunjunganRumahData) => {
    const formattedDate = new Date(item.tanggalKunjungan).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const studentObj = siswa.find(s => s.nis === item.nis);

    const htmlContent = `
      <div class="kop-header">
        <div class="kop-title">YAYASAN ALDIANA NUSANTARA</div>
        <div class="kop-title" style="font-size: 16pt;">${classNameFilter}</div>
        <div class="kop-sub" style="font-weight: bold;">Sistem Integrasi Kesiswaan - Bimbingan dan Konseling</div>
        <div class="kop-sub" style="font-size: 9pt;">Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan</div>
      </div>

      <div class="doc-title">SURAT RINGKASAN LAPORAN KUNJUNGAN RUMAH (HOME VISIT)</div>

      <p>Pada hari ini, layanan Bimbingan dan Konseling sekolah telah melaksanakan kegiatan Kunjungan Rumah (Home Visit) ke kediaman orang tua/wali murid dengan rincian identitas sebagai berikut:</p>

      <table class="meta-table">
        <tr>
          <td style="width: 25%; font-weight: bold;">Nama Siswa</td>
          <td style="width: 3%;">:</td>
          <td style="width: 72%; font-weight: bold; text-transform: uppercase;">${item.namaSiswa}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">NIS</td>
          <td>:</td>
          <td>${item.nis}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Kelas</td>
          <td>:</td>
          <td>${item.kelas}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Orang Tua / Wali</td>
          <td>:</td>
          <td>${studentObj?.namaOrangTua || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">No. Telepon Kontraks</td>
          <td>:</td>
          <td>${studentObj?.noHp || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Hari, Tanggal Kunjungan</td>
          <td>:</td>
          <td>${formattedDate}</td>
        </tr>
      </table>

      <div class="section-title">A. TUJUAN PELAKSANAAN KUNJUNGAN RUMAH</div>
      <p>${item.tujuanKunjungan || 'Untuk menjalin komunikasi koordinatif dengan wali murid dan memantau kondisi belajar di rumah.'}</p>

      <div class="section-title">B. HASIL DAN TEMUAN UTAMA KUNJUNGAN</div>
      <p>${item.hasilTemuan || 'Pertemuan berjalan kondusif, orang tua bersedia mendukung program kedisiplinan dan monitoring sekolah secara penuh.'}</p>

      <div class="section-title">C. REKOMENDASI DAN RENCANA TINDAK LANJUT</div>
      <p>Sekolah menyarankan koordinasi berkala minimal sekali seminggu. Orang tua setuju membatasi penggunaan gawai dan meningkatkan pengawasan studi mandiri siswa.</p>

      <p style="margin-top: 30px;">Demikian ringkasan laporan kunjungan rumah ini dibuat dengan sebenar-benarnya untuk digunakan sebagai dasar pembinaan terpadu bimbingan konseling.</p>

      <table class="signature-block">
        <tr>
          <td>
            <p>Orang Tua / Wali Murid,</p>
            <br/><br/><br/><br/>
            <p style="font-weight: bold;">( ________________________ )</p>
          </td>
          <td>
            <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Guru Pembimbing / BK,</p>
            <br/><br/><br/><br/>
            <p style="font-weight: bold; text-decoration: underline;">${currentUser.nama}</p>
            <p style="font-size: 9pt; margin-top: -10px;">NIP. / NUPTK. -</p>
          </td>
        </tr>
      </table>
    `;

    downloadWordDoc(`Laporan_HomeVisit_${item.nis}_${item.tanggalKunjungan}.doc`, htmlContent);
  };

  const handleExportKonselingWord = (item: KonselingData) => {
    const formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const studentObj = siswa.find(s => s.nis === item.nis);

    const htmlContent = `
      <div class="kop-header">
        <div class="kop-title">YAYASAN ALDIANA NUSANTARA</div>
        <div class="kop-title" style="font-size: 16pt;">${classNameFilter}</div>
        <div class="kop-sub" style="font-weight: bold;">Sistem Integrasi Kesiswaan - Bimbingan dan Konseling</div>
        <div class="kop-sub" style="font-size: 9pt;">Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan</div>
      </div>

      <div class="doc-title">LAPORAN HASIL GURU BIMBINGAN DAN KONSELING SISWA</div>

      <p>Berikut adalah draf ringkasan layanan bimbingan konseling yang telah dilaksanakan untuk siswa bersangkutan:</p>

      <table class="meta-table">
        <tr>
          <td style="width: 25%; font-weight: bold;">Nama Siswa</td>
          <td style="width: 3%;">:</td>
          <td style="width: 72%; font-weight: bold; text-transform: uppercase;">${item.namaSiswa}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">NIS</td>
          <td>:</td>
          <td>${item.nis}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Kelas</td>
          <td>:</td>
          <td>${item.kelas}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Orang Tua / Wali</td>
          <td>:</td>
          <td>${studentObj?.namaOrangTua || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">No. Telepon Kontak</td>
          <td>:</td>
          <td>${studentObj?.noHp || '-'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Jenis Konseling</td>
          <td>:</td>
          <td>${item.jenisKonseling}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Hari, Tanggal Layanan</td>
          <td>:</td>
          <td>${formattedDate}</td>
        </tr>
      </table>

      <div class="section-title">A. PERMASALAHAN UTAMA</div>
      <p>${item.permasalahanUtama || '-'}</p>

      <div class="section-title">B. ANALISIS GURU BIMBINGAN DAN KONSELING (BK)</div>
      <p>${item.analisisBK || '-'}</p>

      <div class="section-title">C. SOLUSI DAN REKOMENDASI YANG DITAWARKAN</div>
      <p>${item.solusiRekomendasi || '-'}</p>

      <div class="section-title">D. HASIL EVALUASI LAYANAN</div>
      <p>${item.hasilEvaluasi || '-'}</p>

      <div class="section-title">E. TINDAK LANJUT (FOLLOW-UP)</div>
      <p>${item.tindakLanjut || '-'}</p>

      <p style="margin-top: 30px;">Demikian laporan bimbingan konseling ini dibuat untuk dipergunakan sebagaimana mestinya dalam pembinaan perkembangan siswa.</p>

      <table class="signature-block">
        <tr>
          <td>
            <p>Siswa Bersangkutan,</p>
            <br/><br/><br/><br/>
            <p style="font-weight: bold;">( ${item.namaSiswa} )</p>
          </td>
          <td>
            <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Guru Pembimbing / BK,</p>
            <br/><br/><br/><br/>
            <p style="font-weight: bold; text-decoration: underline;">${currentUser.nama}</p>
            <p style="font-size: 9pt; margin-top: -10px;">NIP. / NUPTK. -</p>
          </td>
        </tr>
      </table>
    `;

    downloadWordDoc(`Laporan_Konseling_${item.nis}_${item.tanggal}.doc`, htmlContent);
    showLocalToast('Laporan Konseling diunduh dalam format Word (.doc)');
  };


  // ------------------ 4. SUB-FITUR: REKAP KEHADIRAN BK ------------------
  const [formKehadiran, setFormKehadiran] = useState({
    nis: '',
    mingguKe: 'Minggu 1',
    bulan: 'Januari',
    tahun: '2026',
    hadir: 5,
    sakit: 0,
    izin: 0,
    alfa: 0,
    keterangan: ''
  });

  const listMinggu = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5'];
  const listBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handleAddKehadiran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKehadiran.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formKehadiran.nis);
    if (!studentObj) return;

    // Check if duplicate week/month/student
    const exists = kehadiranList.some(item => 
      item.nis === formKehadiran.nis && 
      item.mingguKe === formKehadiran.mingguKe && 
      item.bulan === formKehadiran.bulan &&
      item.tahun === formKehadiran.tahun
    );

    if (exists) {
      showLocalToast('Siswa tersebut sudah diinput rekap kehadirannya pada minggu ini.', 'error');
      return;
    }

    const counts = {
      hadir: formKehadiran.hadir,
      sakit: formKehadiran.sakit,
      izin: formKehadiran.izin,
      alfa: formKehadiran.alfa,
      jumlah: formKehadiran.hadir + formKehadiran.sakit + formKehadiran.izin + formKehadiran.alfa
    };

    const newKehadiran: KehadiranData = {
      id: 'H-' + Date.now(),
      nis: formKehadiran.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      mingguKe: formKehadiran.mingguKe,
      bulan: formKehadiran.bulan,
      tahun: formKehadiran.tahun,
      hadir: counts.hadir,
      sakit: counts.sakit,
      izin: counts.izin,
      alfa: counts.alfa,
      jumlah: counts.jumlah,
      status: counts.hadir > 0 ? 'Hadir' : (counts.sakit > 0 ? 'Sakit' : (counts.izin > 0 ? 'Izin' : 'Alfa')),
      keterangan: formKehadiran.keterangan
    };

    saveKehadiran([newKehadiran, ...kehadiranList]);
    showLocalToast('Rekap absensi mingguan siswa berhasil direkam.');
    setFormKehadiran(prev => ({
      ...prev,
      nis: '',
      hadir: 5,
      sakit: 0,
      izin: 0,
      alfa: 0,
      keterangan: ''
    }));
  };

  const handleDeleteKehadiran = (id: string) => {
    const updated = kehadiranList.filter(item => item.id !== id);
    saveKehadiran(updated);
    showLocalToast('Rekap kehadiran berhasil dihapus.');
  };

  // --- Attendance Analytics Generation ---
  // Distribution of statuses (Hadir, Sakit, Izin, Alfa)
  const statusCounts = kehadiranList.reduce((acc, curr) => {
    const counts = getRecordCounts(curr);
    acc.Hadir += counts.hadir;
    acc.Sakit += counts.sakit;
    acc.Izin += counts.izin;
    acc.Alfa += counts.alfa;
    return acc;
  }, { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 } as Record<string, number>);

  const pieChartData = [
    { name: 'Hadir', value: statusCounts.Hadir, color: '#10B981' }, // emerald-500
    { name: 'Sakit', value: statusCounts.Sakit, color: '#3B82F6' }, // blue-500
    { name: 'Izin', value: statusCounts.Izin, color: '#F59E0B' },  // amber-500
    { name: 'Alfa', value: statusCounts.Alfa, color: '#EF4444' }   // red-500
  ].filter(d => d.value > 0);

  // Per Class Attendance summary
  const classStatusSummary = kehadiranList.reduce((acc, curr) => {
    const cl = curr.kelas;
    const counts = getRecordCounts(curr);
    if (!acc[cl]) {
      acc[cl] = { kelas: cl, Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
    }
    acc[cl].Hadir += counts.hadir;
    acc[cl].Sakit += counts.sakit;
    acc[cl].Izin += counts.izin;
    acc[cl].Alfa += counts.alfa;
    return acc;
  }, {} as Record<string, { kelas: string; Hadir: number; Sakit: number; Izin: number; Alfa: number }>);

  const barChartClassData = Object.values(classStatusSummary);

  // Absensi Per-Bulan Trend
  const monthlyStatusSummary = listBulan.map(b => {
    const records = kehadiranList.filter(h => h.bulan === b);
    const totals = records.reduce((acc, curr) => {
      const counts = getRecordCounts(curr);
      acc.Hadir += counts.hadir;
      acc.Sakit += counts.sakit;
      acc.Izin += counts.izin;
      acc.Alfa += counts.alfa;
      return acc;
    }, { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 });
    return {
      bulan: b.substring(0, 3),
      ...totals
    };
  }).filter(b => b.Hadir > 0 || b.Sakit > 0 || b.Izin > 0 || b.Alfa > 0);

  // DOWNLOAD ATTENDANCE PDF USING JSPDF
  const handleExportAttendancePDF = () => {
    const doc = new jsPDF();
    let currentY = 15;

    // Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('YAYASAN ALDIANA NUSANTARA', 105, currentY, { align: 'center' });
    currentY += 5.5;
    doc.setFontSize(14);
    doc.text(classNameFilter.toUpperCase(), 105, currentY, { align: 'center' });
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistem Integrasi Kesiswaan - Bimbingan dan Konseling', 105, currentY, { align: 'center' });
    currentY += 4.5;
    doc.setFontSize(7.5);
    doc.text('Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan', 105, currentY, { align: 'center' });
    currentY += 3;
    doc.line(15, currentY, 195, currentY);
    currentY += 8;

    // Document title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN REKAPITULASI PRESENSI & GRAFIK ABSENSI SISWA', 105, currentY, { align: 'center' });
    currentY += 10;

    // Metadata
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak Oleh: ${currentUser.nama} (${currentUser.role})`, 15, currentY);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 140, currentY);
    currentY += 10;

    // --- SECTION A: REKAPITULASI PRESENSI PER-KELAS & DIAGRAM ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('A. DIAGRAM & REKAPITULASI PRESENSI PER-KELAS', 15, currentY);
    currentY += 6;

    // Legend
    doc.setFillColor(16, 185, 129); doc.rect(15, currentY, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('Hadir', 19, currentY + 2.5);

    doc.setFillColor(59, 130, 246); doc.rect(30, currentY, 3, 3, 'F');
    doc.text('Sakit', 34, currentY + 2.5);

    doc.setFillColor(245, 158, 11); doc.rect(45, currentY, 3, 3, 'F');
    doc.text('Izin', 49, currentY + 2.5);

    doc.setFillColor(239, 68, 68); doc.rect(60, currentY, 3, 3, 'F');
    doc.text('Alfa', 64, currentY + 2.5);
    currentY += 7;

    if (barChartClassData.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('Belum ada data rekapitulasi per kelas.', 15, currentY);
      currentY += 8;
    } else {
      barChartClassData.forEach((clItem: any) => {
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Kelas: ${clItem.kelas}`, 15, currentY + 3.5);

        // Draw stacked diagram
        const totalCl = clItem.Hadir + clItem.Sakit + clItem.Izin + clItem.Alfa;
        const barStartX = 45;
        const barTotalWidth = 85;
        const barHeight = 4.5;

        // Background track
        doc.setFillColor(241, 245, 249);
        doc.rect(barStartX, currentY, barTotalWidth, barHeight, 'F');

        if (totalCl > 0) {
          let currX = barStartX;
          
          // Hadir (Green)
          if (clItem.Hadir > 0) {
            const wHadir = (clItem.Hadir / totalCl) * barTotalWidth;
            doc.setFillColor(16, 185, 129);
            doc.rect(currX, currentY, wHadir, barHeight, 'F');
            currX += wHadir;
          }
          
          // Sakit (Blue)
          if (clItem.Sakit > 0) {
            const wSakit = (clItem.Sakit / totalCl) * barTotalWidth;
            doc.setFillColor(59, 130, 246);
            doc.rect(currX, currentY, wSakit, barHeight, 'F');
            currX += wSakit;
          }

          // Izin (Amber)
          if (clItem.Izin > 0) {
            const wIzin = (clItem.Izin / totalCl) * barTotalWidth;
            doc.setFillColor(245, 158, 11);
            doc.rect(currX, currentY, wIzin, barHeight, 'F');
            currX += wIzin;
          }

          // Alfa (Red)
          if (clItem.Alfa > 0) {
            const wAlfa = (clItem.Alfa / totalCl) * barTotalWidth;
            doc.setFillColor(239, 68, 68);
            doc.rect(currX, currentY, wAlfa, barHeight, 'F');
            currX += wAlfa;
          }
        }

        // Print stats numbers text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const statsStr = `H: ${clItem.Hadir} | S: ${clItem.Sakit} | I: ${clItem.Izin} | A: ${clItem.Alfa} (Tot: ${totalCl})`;
        doc.text(statsStr, barStartX + barTotalWidth + 4, currentY + 3.5);

        currentY += 8;
      });
    }

    currentY += 6;

    // --- SECTION B: REKAPITULASI PRESENSI PER-BULAN & DIAGRAM ---
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('B. DIAGRAM & REKAPITULASI PRESENSI PER-BULAN', 15, currentY);
    currentY += 6;

    // Legend repeated for readability on page break
    doc.setFillColor(16, 185, 129); doc.rect(15, currentY, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('Hadir', 19, currentY + 2.5);

    doc.setFillColor(59, 130, 246); doc.rect(30, currentY, 3, 3, 'F');
    doc.text('Sakit', 34, currentY + 2.5);

    doc.setFillColor(245, 158, 11); doc.rect(45, currentY, 3, 3, 'F');
    doc.text('Izin', 49, currentY + 2.5);

    doc.setFillColor(239, 68, 68); doc.rect(60, currentY, 3, 3, 'F');
    doc.text('Alfa', 64, currentY + 2.5);
    currentY += 7;

    if (monthlyStatusSummary.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('Belum ada data rekapitulasi bulanan.', 15, currentY);
      currentY += 8;
    } else {
      monthlyStatusSummary.forEach((mItem: any) => {
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Bulan: ${mItem.bulan}`, 15, currentY + 3.5);

        // Draw stacked diagram
        const totalM = mItem.Hadir + mItem.Sakit + mItem.Izin + mItem.Alfa;
        const barStartX = 45;
        const barTotalWidth = 85;
        const barHeight = 4.5;

        // Background track
        doc.setFillColor(241, 245, 249);
        doc.rect(barStartX, currentY, barTotalWidth, barHeight, 'F');

        if (totalM > 0) {
          let currX = barStartX;
          
          // Hadir (Green)
          if (mItem.Hadir > 0) {
            const wHadir = (mItem.Hadir / totalM) * barTotalWidth;
            doc.setFillColor(16, 185, 129);
            doc.rect(currX, currentY, wHadir, barHeight, 'F');
            currX += wHadir;
          }
          
          // Sakit (Blue)
          if (mItem.Sakit > 0) {
            const wSakit = (mItem.Sakit / totalM) * barTotalWidth;
            doc.setFillColor(59, 130, 246);
            doc.rect(currX, currentY, wSakit, barHeight, 'F');
            currX += wSakit;
          }

          // Izin (Amber)
          if (mItem.Izin > 0) {
            const wIzin = (mItem.Izin / totalM) * barTotalWidth;
            doc.setFillColor(245, 158, 11);
            doc.rect(currX, currentY, wIzin, barHeight, 'F');
            currX += wIzin;
          }

          // Alfa (Red)
          if (mItem.Alfa > 0) {
            const wAlfa = (mItem.Alfa / totalM) * barTotalWidth;
            doc.setFillColor(239, 68, 68);
            doc.rect(currX, currentY, wAlfa, barHeight, 'F');
            currX += wAlfa;
          }
        }

        // Print stats numbers text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const statsStr = `H: ${mItem.Hadir} | S: ${mItem.Sakit} | I: ${mItem.Izin} | A: ${mItem.Alfa} (Tot: ${totalM})`;
        doc.text(statsStr, barStartX + barTotalWidth + 4, currentY + 3.5);

        currentY += 8;
      });
    }

    currentY += 10;

    // --- SECTION C: RINCIAN JURNAL ABSENSI DETAIL SISWA ---
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('C. RINCIAN JURNAL ABSENSI DETAIL SISWA', 15, currentY);
    currentY += 6;

    // Table Headers
    const drawTableHeader = (y: number) => {
      doc.setFillColor(240, 243, 246);
      doc.rect(15, y, 180, 8, 'F');
      doc.rect(15, y, 180, 8, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('NIS', 17, y + 5.5);
      doc.text('Nama Siswa', 38, y + 5.5);
      doc.text('Kelas', 85, y + 5.5);
      doc.text('Periode', 105, y + 5.5);
      doc.text('H  S  I  A  J', 140, y + 5.5);
      doc.text('Keterangan', 165, y + 5.5);
    };

    drawTableHeader(currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');

    if (kehadiranList.length === 0) {
      doc.rect(15, currentY, 180, 10, 'S');
      doc.text('Belum ada data rekapitulasi kehadiran siswa.', 105, currentY + 6.5, { align: 'center' });
      currentY += 10;
    } else {
      kehadiranList.forEach((item) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
          drawTableHeader(currentY);
          currentY += 8;
          doc.setFont('helvetica', 'normal');
        }

        const counts = getRecordCounts(item);
        doc.setFontSize(8);
        doc.text(item.nis, 17, currentY + 5);
        const truncName = item.namaSiswa.length > 20 ? item.namaSiswa.substring(0, 18) + '..' : item.namaSiswa;
        doc.text(truncName, 38, currentY + 5);
        doc.text(item.kelas, 85, currentY + 5);
        
        const periodText = `${item.mingguKe}, ${item.bulan.substring(0, 3)} ${item.tahun}`;
        doc.text(periodText, 105, currentY + 5);
        
        const rValue = `${counts.hadir}  ${counts.sakit}  ${counts.izin}  ${counts.alfa}  ${counts.jumlah}`;
        doc.text(rValue, 140, currentY + 5);
        
        const reasonText = item.keterangan || '-';
        const truncReason = reasonText.length > 15 ? reasonText.substring(0, 13) + '..' : reasonText;
        doc.text(truncReason, 165, currentY + 5);

        doc.rect(15, currentY, 180, 7.5, 'S');
        currentY += 7.5;
      });
    }

    currentY += 10;
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    // Attendance Summary counts in PDF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('AKUMULASI TOTAL REKAPITULASI PRESENSI:', 15, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Total Hadir : ${statusCounts.Hadir} records`, 20, currentY);
    doc.text(`Total Sakit : ${statusCounts.Sakit} records`, 110, currentY);
    currentY += 5;
    doc.text(`Total Izin  : ${statusCounts.Izin} records`, 20, currentY);
    doc.text(`Total Alfa  : ${statusCounts.Alfa} records`, 110, currentY);
    currentY += 15;

    // Signatures
    const signY = currentY;
    doc.setFontSize(8.5);
    doc.text('Diketahui Oleh,', 25, signY);
    doc.text('Kepala Sekolah / Wali Kelas,', 25, signY + 5);
    doc.line(25, signY + 23, 75, signY + 23);

    doc.text('Disusun Oleh,', 140, signY);
    doc.text('Petugas BK Sekolah,', 140, signY + 5);
    doc.line(140, signY + 23, 185, signY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(currentUser.nama, 140, signY + 27);

    doc.save(`Rekap_Kehadiran_BK_${classNameFilter.replace(/\s+/g, '_')}.pdf`);
    showLocalToast('Laporan Rekap Absensi & Diagram BK diunduh dalam format PDF.');
  };


  // ------------------ 5. SUB-FITUR: GENERATOR SURAT BK ------------------
  const [formSurat, setFormSurat] = useState({
    nis: '',
    jenisSurat: 'Surat Panggilan' as 'Surat Panggilan' | 'Surat Kontrak Perilaku' | 'Surat Home Visit' | 'Surat Rujukan',
    nomorSurat: '023/BK-NP/VII/2026',
    perihal: 'Pemanggilan Orang Tua / Koordinasi Perilaku'
  });

  const [generatedLetter, setGeneratedLetter] = useState<{
    nis: string;
    namaSiswa: string;
    kelas: string;
    namaOrangTua: string;
    noHp: string;
    jenisSurat: string;
    nomorSurat: string;
    perihal: string;
    tanggal: string;
    bodyText: string;
  } | null>(null);

  // Pre-generate a letter number based on current date
  useEffect(() => {
    const monthRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()];
    const rand = Math.floor(Math.random() * 90) + 10;
    setFormSurat(prev => ({
      ...prev,
      nomorSurat: `${rand}/BK-Nusantara/${monthRoman}/2026`
    }));
  }, [classNameFilter, activeTab]);

  const handleGenerateLetter = () => {
    if (!formSurat.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formSurat.nis);
    if (!studentObj) return;

    const letterBody = 'Mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid ke Ruang Bimbingan Konseling sekolah pada hari Senin mendatang guna berkoordinasi membicarakan perkembangan akademik dan ketertiban putra/putri Bapak/Ibu.';

    setGeneratedLetter({
      nis: formSurat.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      namaOrangTua: studentObj.namaOrangTua,
      noHp: studentObj.noHp,
      jenisSurat: formSurat.jenisSurat,
      nomorSurat: formSurat.nomorSurat,
      perihal: formSurat.perihal,
      tanggal: new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      bodyText: letterBody
    });

    showLocalToast('Draf surat resmi BK berhasil dibuat! Lihat pratinjau di bawah.');
  };

  const handleDownloadSuratDoc = () => {
    if (!generatedLetter) return;

    const formattedDateNow = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const letterHtmlContent = `
      <div class="kop-header">
        <div class="kop-title" style="font-size: 14pt;">YAYASAN ALDIANA NUSANTARA</div>
        <div class="kop-title" style="font-size: 16pt; margin-top: 2px;">${classNameFilter}</div>
        <div class="kop-sub" style="font-weight: bold; font-size: 10pt; margin-top: 4px;">Sistem Integrasi Kesiswaan - Bimbingan dan Konseling</div>
        <div class="kop-sub" style="font-size: 9pt; margin-top: 2px;">Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan</div>
      </div>

      <table class="meta-table" style="margin-top: 10px; width: 100%;">
        <tr>
          <td style="width: 15%;">Nomor</td>
          <td style="width: 3%;">:</td>
          <td style="width: 47%;">${generatedLetter.nomorSurat}</td>
          <td style="width: 35%; text-align: right;">Jakarta, ${formattedDateNow}</td>
        </tr>
        <tr>
          <td>Lampiran</td>
          <td>:</td>
          <td>- (Satu Berkas)</td>
          <td></td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Perihal</td>
          <td>:</td>
          <td style="font-weight: bold; text-decoration: underline;">${generatedLetter.perihal}</td>
          <td></td>
        </tr>
      </table>

      <div style="margin-top: 15px; font-size: 11pt;">
        <p>Kepada Yth.<br/>
        Bapak/Ibu Orang Tua / Wali Murid dari <strong>${generatedLetter.namaSiswa.toUpperCase()}</strong> (Kelas ${generatedLetter.kelas})<br/>
        Di Tempat</p>
      </div>

      <div style="margin-top: 12px; text-align: justify; font-size: 11pt;">
        <p>Dengan hormat,</p>
        
        <p>Sehubungan dengan pelaksanaan program monitoring bimbingan kepribadian dan ketertiban tata tertib siswa di lingkungan sekolah <strong>${classNameFilter}</strong>, kami mengundang Bapak/Ibu selaku orang tua/wali murid untuk hadir koordinasi.</p>
        
        <p>${generatedLetter.bodyText}</p>
        
        <p>Adapun rincian waktu pertemuan direncanakan sebagai berikut:</p>
        
        <table class="meta-table" style="margin-left: 20px; width: 80%; margin-bottom: 10px;">
          <tr>
            <td style="width: 25%;">Hari, Tanggal</td>
            <td style="width: 3%;">:</td>
            <td>Senin Mendatang</td>
          </tr>
          <tr>
            <td>Waktu</td>
            <td>:</td>
            <td>Pukul 09.00 WIB s/d Selesai</td>
          </tr>
          <tr>
            <td>Tempat</td>
            <td>:</td>
            <td>Ruang Bimbingan Konseling (BK) Gedung Utama</td>
          </tr>
          <tr>
            <td>Petugas BK</td>
            <td>:</td>
            <td>${currentUser.nama}</td>
          </tr>
        </table>

        <p style="margin-top: 10px;">Mengingat pentingnya agenda koordinasi masa depan studi putra/putri Bapak/Ibu ini, kehadiran Bapak/Ibu tepat waktu sangat kami harapkan. Atas perhatian, dukungan, dan kerja sama yang baik, kami ucapkan terima kasih.</p>
      </div>

      <table class="signature-block" style="margin-top: 30px;">
        <tr>
          <td>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah / Kesiswaan</p>
            <br/><br/><br/>
            <p style="font-weight: bold;">( ________________________ )</p>
          </td>
          <td>
            <p>Hormat kami,</p>
            <p>Koordinator Guru BK,</p>
            <br/><br/><br/>
            <p style="font-weight: bold; text-decoration: underline;">${currentUser.nama}</p>
            <p style="font-size: 9pt; margin-top: -10px;">Unit Pelayanan BK Sekolah</p>
          </td>
        </tr>
      </table>
    `;

    downloadWordDoc(`Surat_Resmi_BK_${generatedLetter.nis}.doc`, letterHtmlContent);
  };

  // ------------------ 6. SUB-FITUR: LAPORAN SNBP ------------------
  const [formSnbp, setFormSnbp] = useState({
    nis: '',
    namaUniversitas: '',
    programStudi: '',
    keteranganLulus: 'Lulus' as 'Lulus' | 'Tidak Lulus',
    tahun: '2026',
    catatan: ''
  });

  const handleAddSnbp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSnbp.nis) {
      showLocalToast('Pilih siswa terlebih dahulu!', 'error');
      return;
    }
    const studentObj = schoolStudents.find(s => s.nis === formSnbp.nis);
    if (!studentObj) return;

    if (snbpList.some(item => item.nis === formSnbp.nis)) {
      showLocalToast('Laporan SNBP untuk siswa ini sudah ada! Silakan hapus data lama terlebih dahulu jika ingin memperbarui.', 'error');
      return;
    }

    const newSnbp: SnbpData = {
      id: 'SNBP-' + Date.now(),
      nis: formSnbp.nis,
      namaSiswa: studentObj.nama,
      kelas: studentObj.kelas,
      namaUniversitas: formSnbp.namaUniversitas || '-',
      programStudi: formSnbp.programStudi || '-',
      keteranganLulus: formSnbp.keteranganLulus,
      tahun: formSnbp.tahun,
      catatan: formSnbp.catatan
    };

    saveSnbp([newSnbp, ...snbpList]);
    showLocalToast('Berhasil menambahkan Laporan SNBP siswa.');
    
    setFormSnbp({
      nis: '',
      namaUniversitas: '',
      programStudi: '',
      keteranganLulus: 'Lulus',
      tahun: new Date().getFullYear().toString(),
      catatan: ''
    });
  };

  const handleDeleteSnbp = (id: string) => {
    const updated = snbpList.filter(item => item.id !== id);
    saveSnbp(updated);
    showLocalToast('Laporan SNBP berhasil dihapus.', 'success');
  };

  const handleExportSnbpPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let currentY = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('YAYASAN ALDIANA NUSANTARA', 105, currentY, { align: 'center' });
    currentY += 4.5;
    
    doc.setFontSize(13);
    doc.text(classNameFilter, 105, currentY, { align: 'center' });
    currentY += 4.5;
    
    doc.setFontSize(9);
    doc.text('Sistem Integrasi Kesiswaan - Bimbingan dan Konseling', 105, currentY, { align: 'center' });
    currentY += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan', 105, currentY, { align: 'center' });
    currentY += 3;

    doc.setLineWidth(0.6);
    doc.line(15, currentY, 195, currentY);
    doc.setLineWidth(0.2);
    doc.line(15, currentY + 0.8, 195, currentY + 0.8);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN HASIL SELEKSI NASIONAL BERDASARKAN PRESTASI (SNBP)', 105, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak Oleh: ${currentUser.nama} (${currentUser.role})`, 15, currentY);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 140, currentY);
    currentY += 10;

    const drawTableHeader = (y: number) => {
      doc.setFillColor(240, 243, 246);
      doc.rect(15, y, 180, 8, 'F');
      doc.rect(15, y, 180, 8, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('NIS', 17, y + 5.5);
      doc.text('Nama Siswa', 35, y + 5.5);
      doc.text('Kelas', 80, y + 5.5);
      doc.text('Universitas', 100, y + 5.5);
      doc.text('Program Studi', 145, y + 5.5);
      doc.text('Status', 180, y + 5.5);
    };

    drawTableHeader(currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');

    if (snbpList.length === 0) {
      doc.rect(15, currentY, 180, 10, 'S');
      doc.text('Belum ada data laporan seleksi SNBP.', 105, currentY + 6.5, { align: 'center' });
      currentY += 10;
    } else {
      snbpList.forEach((item) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
          drawTableHeader(currentY);
          currentY += 8;
          doc.setFont('helvetica', 'normal');
        }

        doc.setFontSize(8);
        doc.text(item.nis, 17, currentY + 5);
        const truncName = item.namaSiswa.length > 20 ? item.namaSiswa.substring(0, 18) + '..' : item.namaSiswa;
        doc.text(truncName, 35, currentY + 5);
        doc.text(item.kelas, 80, currentY + 5);
        
        const truncUni = item.namaUniversitas.length > 22 ? item.namaUniversitas.substring(0, 20) + '..' : item.namaUniversitas;
        doc.text(truncUni, 100, currentY + 5);

        const truncProdi = item.programStudi.length > 18 ? item.programStudi.substring(0, 16) + '..' : item.programStudi;
        doc.text(truncProdi, 145, currentY + 5);

        doc.setFont('helvetica', 'bold');
        if (item.keteranganLulus === 'Lulus') {
          doc.setTextColor(16, 185, 129);
        } else {
          doc.setTextColor(239, 68, 68);
        }
        doc.text(item.keteranganLulus, 180, currentY + 5);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        doc.rect(15, currentY, 180, 7.5, 'S');
        currentY += 7.5;
      });
    }

    currentY += 10;
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    const totalSnbp = snbpList.length;
    const lulusCount = snbpList.filter(item => item.keteranganLulus === 'Lulus').length;
    const tidakLulusCount = totalSnbp - lulusCount;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REKAPITULASI KELULUSAN SNBP:', 15, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Total Siswa Terdaftar : ${totalSnbp} Siswa`, 20, currentY);
    doc.text(`Total Lulus SNBP      : ${lulusCount} Siswa`, 20, currentY + 5);
    doc.text(`Total Tidak Lulus      : ${tidakLulusCount} Siswa`, 20, currentY + 10);
    currentY += 20;

    const signY = currentY;
    doc.setFontSize(8.5);
    doc.text('Diketahui Oleh,', 25, signY);
    doc.text('Kepala Sekolah / Wakasek Kurikulum,', 25, signY + 5);
    doc.line(25, signY + 23, 75, signY + 23);

    doc.text('Disusun Oleh,', 140, signY);
    doc.text('Guru Bimbingan Konseling (BK),', 140, signY + 5);
    doc.line(140, signY + 23, 185, signY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(currentUser.nama, 140, signY + 27);

    doc.save(`Laporan_SNBP_${classNameFilter.replace(/\s+/g, '_')}.pdf`);
    showLocalToast('Laporan SNBP berhasil diunduh dalam format PDF.');
  };

  const filteredKehadiranList = kehadiranList.filter(item => {
    if (!searchKehadiranQuery.trim()) return true;
    const q = searchKehadiranQuery.toLowerCase().trim();
    return (
      item.namaSiswa.toLowerCase().includes(q) ||
      item.nis.includes(q) ||
      item.kelas.toLowerCase().includes(q)
    );
  });

  return (
    <div id="layanan-bk-component" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 mt-8">
      
      {/* Toast Alert Popup Local */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 animate-in fade-in duration-300">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <p className="text-xs font-bold">{toast.message}</p>
        </div>
      )}

      {/* Header section with badge */}
      <div className="border-b border-slate-100 pb-5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase rounded-full border border-indigo-100">
            Unit Bimbingan Konseling (BK)
          </span>
          <span className="text-xs text-slate-400 font-mono font-bold">Lokal Database</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Layanan & Konseling BK Terpadu
            </h2>
            <p className="text-xs text-slate-500">Kelola konseling, rekam asesmen murid, rekapitulasi absen siswa, dan cetak surat panggilan resmi.</p>
          </div>
        </div>
      </div>

      {/* Tab Selectors with styling */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
        {[
          { id: 'konseling', label: 'Konseling Siswa', icon: Clipboard },
          { id: 'asesmen', label: 'Asesmen BK', icon: BookMarked },
          { id: 'kunjungan', label: 'Kunjungan Rumah', icon: Home },
          { id: 'kehadiran', label: 'Rekap Kehadiran', icon: CheckSquare },
          { id: 'surat', label: 'Generator Surat', icon: FileCheck },
          ...((classNameFilter === 'SMA NUSANTARA PLUS' || 
               classNameFilter === 'SMK NUSANTARA 1' || 
               classNameFilter === 'SMK 2 KESEHATAN') ? [{ id: 'snbp', label: 'Laporan SNBP', icon: GraduationCap }] : [])
        ].map(tb => {
          const Icon = tb.icon;
          const isActive = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => {
                setActiveTab(tb.id as any);
                setGeneratedLetter(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* RENDER CONTENT BASED ON ACTIVE TAB */}
      <div className="mt-6">

        {/* ================== TAB 1: KONSELING SISWA ================== */}
        {activeTab === 'konseling' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Form */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Formulir Baru</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Rekam Konseling Siswa</h3>
                </div>

                <form onSubmit={handleAddKonseling} className="space-y-4 text-xs font-semibold text-slate-700">
                  {/* Student dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Siswa / Murid *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formKonseling.nis}
                      onChange={(nis) => setFormKonseling(prev => ({ ...prev, nis }))}
                      placeholder="Cari siswa kesiswaan..."
                    />
                    <input type="hidden" name="konseling_siswa_nis" value={formKonseling.nis} required />
                  </div>

                  {/* Jenis Konseling */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Jenis Konseling *</label>
                    <select
                      required
                      value={formKonseling.jenisKonseling}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, jenisKonseling: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs cursor-pointer transition-all"
                    >
                      <option value="Individu">Konseling Individu</option>
                      <option value="Kelompok">Bimbingan Kelompok</option>
                      <option value="Klasikal">Bimbingan Klasikal</option>
                    </select>
                  </div>

                  {/* Tanggal */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tanggal Konseling *</label>
                    <input
                      type="date"
                      required
                      value={formKonseling.tanggal}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, tanggal: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Permasalahan Utama */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Permasalahan Utama *</label>
                    <textarea
                      required
                      value={formKonseling.permasalahanUtama}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, permasalahanUtama: e.target.value }))}
                      placeholder="Uraikan poin masalah inti..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  {/* Analisis BK */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Analisis BK (Asal Masalah) *</label>
                    <textarea
                      required
                      value={formKonseling.analisisBK}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, analisisBK: e.target.value }))}
                      placeholder="Analisis penyebab terjadinya masalah..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  {/* Solusi Rekomendasi */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Solusi & Rekomendasi *</label>
                    <textarea
                      required
                      value={formKonseling.solusiRekomendasi}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, solusiRekomendasi: e.target.value }))}
                      placeholder="Alternatif jalan keluar..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  {/* Hasil Evaluasi */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Hasil Evaluasi *</label>
                    <textarea
                      required
                      value={formKonseling.hasilEvaluasi}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, hasilEvaluasi: e.target.value }))}
                      placeholder="Hasil setelah pelaksanaan konseling..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  {/* Tindak Lanjut */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tindak Lanjut (Follow-Up) *</label>
                    <textarea
                      required
                      value={formKonseling.tindakLanjut}
                      onChange={(e) => setFormKonseling(prev => ({ ...prev, tindakLanjut: e.target.value }))}
                      placeholder="Program kelanjutan pasca konseling..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Simpan Catatan BK
                  </button>
                </form>
              </div>

              {/* Right Column: List Table */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Daftar Riwayat Bimbingan Konseling Siswa</h3>
                  <span className="text-[10px] font-bold font-mono text-slate-400">Total: {konselingList.length} logs</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Siswa / Kelas</th>
                        <th className="py-3 px-4">Jenis</th>
                        <th className="py-3 px-4">Permasalahan Utama</th>
                        <th className="py-3 px-4">Solusi & Tindak Lanjut</th>
                        <th className="py-3 px-4 text-center">Unduh DOC</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                      {konselingList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center italic text-slate-400 font-medium">
                            Belum ada rekam data konseling yang diinput.
                          </td>
                        </tr>
                      ) : (
                        konselingList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              <span className="block font-bold">{item.namaSiswa}</span>
                              <span className="text-[9px] text-slate-400 font-mono">NIS: {item.nis} | {item.kelas}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                item.jenisKonseling === 'Individu' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : item.jenisKonseling === 'Kelompok'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              }`}>
                                {item.jenisKonseling}
                              </span>
                              <span className="block text-[9px] text-slate-400 font-semibold mt-1">{item.tanggal}</span>
                            </td>
                            <td className="py-3.5 px-4 leading-normal max-w-xs font-medium">
                              <b className="text-slate-800 block text-[11px] mb-0.5">Masalah:</b> {item.permasalahanUtama}
                              <b className="text-indigo-600 block text-[10px] mt-1.5">Analisis BK:</b> {item.analisisBK}
                            </td>
                            <td className="py-3.5 px-4 leading-normal max-w-xs">
                              <b className="text-slate-800 block text-[11px] mb-0.5">Solusi:</b> {item.solusiRekomendasi}
                              <b className="text-emerald-600 block text-[10px] mt-1.5">Tindak Lanjut:</b> {item.tindakLanjut}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleExportKonselingWord(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer transition-colors border border-indigo-100/60 text-[10px]"
                                title="Unduh Laporan Konseling Word (.doc)"
                              >
                                <Download className="w-3 h-3 text-indigo-600" /> Word (.doc)
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteKonseling(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================== TAB 2: ASESMEN BK ================== */}
        {activeTab === 'asesmen' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Input */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Identitas Perkembangan</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Rekam Asesmen Siswa</h3>
                </div>

                <form onSubmit={handleAddAsesmen} className="space-y-4 text-xs font-semibold text-slate-700">
                  {/* Student */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Siswa *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formAsesmen.nis}
                      onChange={(nis) => setFormAsesmen(prev => ({ ...prev, nis }))}
                      placeholder="Cari siswa kesiswaan..."
                    />
                    <input type="hidden" name="asesmen_siswa_nis" value={formAsesmen.nis} required />
                  </div>

                  {/* Hasil AKPD */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Hasil Analisis Kebutuhan (AKPD) *</label>
                    <textarea
                      required
                      value={formAsesmen.hasilAKPD}
                      onChange={(e) => setFormAsesmen(prev => ({ ...prev, hasilAKPD: e.target.value }))}
                      placeholder="Contoh: Butuh motivasi belajar intensif, minat karir tinggi..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium"
                    />
                  </div>

                  {/* Gaya Belajar */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Gaya Belajar *</label>
                    <input
                      type="text"
                      required
                      value={formAsesmen.gayaBelajar}
                      onChange={(e) => setFormAsesmen(prev => ({ ...prev, gayaBelajar: e.target.value }))}
                      placeholder="Contoh: Visual, Auditori, Kinestetik"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold"
                    />
                  </div>

                  {/* AUM */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">AUM (Alat Ungkap Masalah) *</label>
                    <textarea
                      required
                      value={formAsesmen.aum}
                      onChange={(e) => setFormAsesmen(prev => ({ ...prev, aum: e.target.value }))}
                      placeholder="Deskripsi masalah AUM yang terdeteksi..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium"
                    />
                  </div>

                  {/* Psikotes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Hasil Psikotes *</label>
                    <input
                      type="text"
                      required
                      value={formAsesmen.psikotes}
                      onChange={(e) => setFormAsesmen(prev => ({ ...prev, psikotes: e.target.value }))}
                      placeholder="Contoh: IQ 110 (Rata-rata Atas) / Stabil"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold"
                    />
                  </div>

                  {/* Minat Bakat */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Minat Bakat *</label>
                    <input
                      type="text"
                      required
                      value={formAsesmen.minatBakat}
                      onChange={(e) => setFormAsesmen(prev => ({ ...prev, minatBakat: e.target.value }))}
                      placeholder="Contoh: Sains & Logika Matematika, Olahraga"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Simpan Asesmen Siswa
                  </button>
                </form>
              </div>

              {/* List table asesmen */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Berkas Dokumen Asesmen BK Siswa</h3>
                  <span className="text-[10px] font-bold font-mono text-slate-400">Total: {asesmenList.length} siswa</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asesmenList.length === 0 ? (
                    <div className="col-span-2 bg-slate-50 border border-slate-200 border-dashed p-10 text-center text-slate-400 italic rounded-2xl font-medium text-xs">
                      Belum ada dokumen asesmen kesiswaan yang tercatat.
                    </div>
                  ) : (
                    asesmenList.map(item => (
                      <div key={item.id} className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 space-y-3 shadow-xs relative transition-colors">
                        <button
                          onClick={() => handleDeleteAsesmen(item.id)}
                          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-0.5 pr-6">
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono font-bold text-slate-500">{item.kelas}</span>
                          <h4 className="font-extrabold text-slate-800 text-sm block mt-1">{item.namaSiswa}</h4>
                          <span className="text-[9px] text-slate-400 font-mono block">NIS: {item.nis}</span>
                        </div>

                        <div className="divide-y divide-slate-100 text-[11px] space-y-2 pt-2 border-t border-slate-100">
                          <div className="pt-1.5 flex justify-between gap-4 font-medium">
                            <span className="text-slate-400">Hasil AKPD:</span>
                            <span className="text-slate-800 text-right font-semibold">{item.hasilAKPD}</span>
                          </div>
                          <div className="pt-1.5 flex justify-between gap-4 font-medium">
                            <span className="text-slate-400">Gaya Belajar:</span>
                            <span className="text-indigo-600 text-right font-bold">{item.gayaBelajar}</span>
                          </div>
                          <div className="pt-1.5 flex justify-between gap-4 font-medium">
                            <span className="text-slate-400">AUM:</span>
                            <span className="text-slate-800 text-right">{item.aum}</span>
                          </div>
                          <div className="pt-1.5 flex justify-between gap-4 font-medium">
                            <span className="text-slate-400">Psikotes:</span>
                            <span className="text-blue-600 font-bold">{item.psikotes}</span>
                          </div>
                          <div className="pt-1.5 flex justify-between gap-4 font-medium">
                            <span className="text-slate-400">Minat Bakat:</span>
                            <span className="text-emerald-600 font-extrabold">{item.minatBakat}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================== TAB 3: KUNJUNGAN RUMAH ================== */}
        {activeTab === 'kunjungan' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Input */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Home Visit Portal</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Input Kunjungan Rumah</h3>
                </div>

                <form onSubmit={handleAddKunjungan} className="space-y-4 text-xs font-semibold text-slate-700 text-left">
                  {/* Student */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Siswa Dikunjungi *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formKunjungan.nis}
                      onChange={(nis) => setFormKunjungan(prev => ({ ...prev, nis }))}
                      placeholder="Cari siswa dikunjungi..."
                    />
                    <input type="hidden" name="kunjungan_siswa_nis" value={formKunjungan.nis} required />
                  </div>

                  {/* Tanggal Kunjungan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tanggal Pelaksanaan *</label>
                    <input
                      type="date"
                      required
                      value={formKunjungan.tanggalKunjungan}
                      onChange={(e) => setFormKunjungan(prev => ({ ...prev, tanggalKunjungan: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Tujuan Kunjungan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tujuan Kunjungan *</label>
                    <textarea
                      required
                      value={formKunjungan.tujuanKunjungan}
                      onChange={(e) => setFormKunjungan(prev => ({ ...prev, tujuanKunjungan: e.target.value }))}
                      placeholder="Contoh: Menindaklanjuti ketidakhadiran siswa beruntun, koordinasi kedisiplinan..."
                      rows={3}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium leading-relaxed"
                    />
                  </div>

                  {/* Hasil Temuan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Hasil & Temuan Kunjungan *</label>
                    <textarea
                      required
                      value={formKunjungan.hasilTemuan}
                      onChange={(e) => setFormKunjungan(prev => ({ ...prev, hasilTemuan: e.target.value }))}
                      placeholder="Uraikan temuan di rumah siswa dan komitmen orang tua..."
                      rows={4}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Simpan Home Visit
                  </button>
                </form>
              </div>

              {/* List Table and Export Word */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Log Pelaksanaan Kunjungan Rumah (Home Visit)</h3>
                  <span className="text-[10px] font-bold font-mono text-slate-400">Total: {kunjunganList.length} kunjungan</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Siswa / Tanggal</th>
                        <th className="py-3 px-4">Tujuan Utama</th>
                        <th className="py-3 px-4">Hasil & Temuan</th>
                        <th className="py-3 px-4 text-center">Unduh Ringkasan</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                      {kunjunganList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center italic text-slate-400 font-medium">
                            Belum ada rekam data kunjungan rumah yang diinput.
                          </td>
                        </tr>
                      ) : (
                        kunjunganList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              <span className="block font-bold">{item.namaSiswa}</span>
                              <span className="text-[9px] text-slate-400 font-mono">NIS: {item.nis} | {item.kelas}</span>
                              <span className="block mt-1 font-mono text-[9px] text-indigo-600 font-extrabold">{item.tanggalKunjungan}</span>
                            </td>
                            <td className="py-3.5 px-4 leading-normal max-w-xs font-semibold">
                              {item.tujuanKunjungan}
                            </td>
                            <td className="py-3.5 px-4 leading-normal max-w-xs text-slate-500 font-medium">
                              {item.hasilTemuan}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleExportKunjunganWord(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer transition-colors border border-indigo-100/60"
                              >
                                <Download className="w-3.5 h-3.5" /> Word (.doc)
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteKunjungan(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================== TAB 4: REKAP KEHADIRAN ================== */}
        {activeTab === 'kehadiran' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Analytics Dashboard Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-5 rounded-3xl border border-slate-200/80">
              
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wide block">Rasio Kehadiran</span>
                  <h4 className="text-xl font-black text-slate-800 mt-1">
                    {kehadiranList.length > 0 
                      ? `${Math.round((statusCounts.Hadir / kehadiranList.length) * 100)}%` 
                      : '0%'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Persentase siswa hadir dari total rekap absensi yang diinput.
                  </p>
                </div>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500 pt-3 border-t border-slate-100 mt-3">
                  <span className="text-emerald-600">● Hadir: {statusCounts.Hadir}</span>
                  <span className="text-rose-600">● Alfa: {statusCounts.Alfa}</span>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase self-start mb-2">Proporsi Status</span>
                {pieChartData.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Belum ada data grafik</span>
                ) : (
                  <div className="w-full h-24 flex items-center justify-between">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={15}
                            outerRadius={30}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 flex flex-col gap-1 text-[10px] font-bold text-slate-600 pl-2">
                      {pieChartData.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span>{entry.name}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Print Controller Banner */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-white">Unduh PDF Absensi Terpadu</h4>
                  <p className="text-[10px] text-indigo-200 mt-1 leading-relaxed">
                    Format cetak absensi modular perkelas yang terisi ringkasan total persentase dan tanda tangan BK.
                  </p>
                </div>
                <button
                  onClick={handleExportAttendancePDF}
                  className="w-full py-2.5 mt-3 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4 text-indigo-600" /> Cetak Rekap PDF
                </button>
              </div>

            </div>

            {/* Input Form & List table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Absensi Form */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Absensi Mingguan</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Rekam Absen Baru</h3>
                </div>

                <form onSubmit={handleAddKehadiran} className="space-y-4 text-xs font-semibold text-slate-700">
                  
                  {/* Student */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Siswa *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formKehadiran.nis}
                      onChange={(nis) => setFormKehadiran(prev => ({ ...prev, nis }))}
                      placeholder="Cari siswa..."
                    />
                    <input type="hidden" name="kehadiran_siswa_nis" value={formKehadiran.nis} required />
                  </div>

                  {/* Periode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase block">Minggu Ke *</label>
                      <select
                        required
                        value={formKehadiran.mingguKe}
                        onChange={(e) => setFormKehadiran(prev => ({ ...prev, mingguKe: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                      >
                        {listMinggu.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase block">Bulan *</label>
                      <select
                        required
                        value={formKehadiran.bulan}
                        onChange={(e) => setFormKehadiran(prev => ({ ...prev, bulan: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                      >
                        {listBulan.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tahun */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tahun Akademik *</label>
                    <input
                      type="text"
                      required
                      value={formKehadiran.tahun}
                      onChange={(e) => setFormKehadiran(prev => ({ ...prev, tahun: e.target.value }))}
                      placeholder="Contoh: 2026"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Rekap Hari Kehadiran */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block font-bold">Perekapan Hari Kehadiran (Mingguan) *</label>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-emerald-600 font-extrabold uppercase block text-center">Hadir (Hari)</label>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          required
                          value={formKehadiran.hadir}
                          onChange={(e) => setFormKehadiran(prev => ({ ...prev, hadir: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-center text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-blue-600 font-extrabold uppercase block text-center">Sakit (Hari)</label>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          required
                          value={formKehadiran.sakit}
                          onChange={(e) => setFormKehadiran(prev => ({ ...prev, sakit: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-center text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-amber-600 font-extrabold uppercase block text-center">Izin (Hari)</label>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          required
                          value={formKehadiran.izin}
                          onChange={(e) => setFormKehadiran(prev => ({ ...prev, izin: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-center text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-rose-600 font-extrabold uppercase block text-center">Alfa (Hari)</label>
                        <input
                          type="number"
                          min="0"
                          max="7"
                          required
                          value={formKehadiran.alfa}
                          onChange={(e) => setFormKehadiran(prev => ({ ...prev, alfa: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-center text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rekapitulasi Jumlah Hari */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block font-bold">Jumlah (Hari)</label>
                    <div className="w-full py-2.5 bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs rounded-xl flex items-center justify-between px-4">
                      <span className="uppercase text-[9px] text-slate-500 tracking-wider">Total Hari Kehadiran Terhitung:</span>
                      <span className="font-mono text-indigo-600 text-sm font-extrabold">
                        {formKehadiran.hadir + formKehadiran.sakit + formKehadiran.izin + formKehadiran.alfa} Hari
                      </span>
                    </div>
                  </div>

                  {/* Alasan / Keterangan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Keterangan / Alasan Tambahan</label>
                    <textarea
                      value={formKehadiran.keterangan}
                      onChange={(e) => setFormKehadiran(prev => ({ ...prev, keterangan: e.target.value }))}
                      placeholder="Tulis alasan sakit/izin/alfa atau catatan BK lainnya..."
                      rows={3}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Rekam Presensi Siswa
                  </button>
                </form>
              </div>

              {/* List Absen Table & Charts visualization */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visualizer charts */}
                {kehadiranList.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Per Class Bar chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-3">Distribusi Presensi Per-Kelas</span>
                      <div className="w-full h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartClassData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="kelas" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                            <YAxis tick={{ fontSize: 9 }} />
                            <Tooltip wrapperStyle={{ fontSize: 10 }} />
                            <Legend wrapperStyle={{ fontSize: 9 }} />
                            <Bar dataKey="Hadir" fill="#10B981" />
                            <Bar dataKey="Sakit" fill="#3B82F6" />
                            <Bar dataKey="Izin" fill="#F59E0B" />
                            <Bar dataKey="Alfa" fill="#EF4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Per Month trend */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-3">Kehadiran Berdasarkan Bulan</span>
                      <div className="w-full h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyStatusSummary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="bulan" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} />
                            <Tooltip wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Hadir" stackId="a" fill="#10B981" />
                            <Bar dataKey="Sakit" stackId="a" fill="#3B82F6" />
                            <Bar dataKey="Izin" stackId="a" fill="#F59E0B" />
                            <Bar dataKey="Alfa" stackId="a" fill="#EF4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                )}

                {/* Absensi Table logs */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-sm">Riwayat Rekapitulasi Presensi Mingguan</h3>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchKehadiranQuery}
                          onChange={(e) => setSearchKehadiranQuery(e.target.value)}
                          placeholder="Cari nama, NIS, atau kelas..."
                          className="pl-8 pr-7 py-2 w-full sm:w-60 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-semibold transition-all shadow-2xs text-slate-800"
                        />
                        {searchKehadiranQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchKehadiranQuery('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-extrabold text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-400 shrink-0">Total: {filteredKehadiranList.length} rekap</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Siswa / Kelas</th>
                          <th className="py-3 px-4">Minggu, Bulan & Tahun</th>
                          <th className="py-3 px-4">Status Absensi</th>
                          <th className="py-3 px-4">Alasan / Keterangan</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                        {filteredKehadiranList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center italic text-slate-400 font-medium">
                              {searchKehadiranQuery ? "Tidak ada rekap presensi yang cocok dengan pencarian." : "Belum ada data presensi mingguan yang terekam."}
                            </td>
                          </tr>
                        ) : (
                          filteredKehadiranList.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                <span className="block font-bold">{item.namaSiswa}</span>
                                <span className="text-[9px] text-slate-400 font-mono">NIS: {item.nis} | {item.kelas}</span>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700 font-mono text-[10px]">
                                {item.mingguKe} - {item.bulan} {item.tahun}
                              </td>
                              <td className="py-3.5 px-4 font-bold">
                                {(() => {
                                  const counts = getRecordCounts(item);
                                  return (
                                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold" title="Hadir">
                                        H: {counts.hadir}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold" title="Sakit">
                                        S: {counts.sakit}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-bold" title="Izin">
                                        I: {counts.izin}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-bold" title="Alfa">
                                        A: {counts.alfa}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-black font-sans text-[9px]" title="Total">
                                        Total: {counts.jumlah} Hari
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3.5 px-4 leading-normal max-w-xs font-medium italic text-slate-500">
                                {item.keterangan || '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKehadiran(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ================== TAB 5: GENERATOR SURAT BK ================== */}
        {activeTab === 'surat' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Form parameter */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Official Letter generator</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Draf Surat Panggilan BK</h3>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleGenerateLetter(); }} className="space-y-4 text-xs font-semibold text-slate-700">
                  
                  {/* Siswa */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Siswa / Murid *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formSurat.nis}
                      onChange={(nis) => setFormSurat(prev => ({ ...prev, nis }))}
                      placeholder="Cari siswa..."
                    />
                    <input type="hidden" name="surat_siswa_nis" value={formSurat.nis} required />
                  </div>

                  {/* Jenis Surat */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Jenis Surat BK *</label>
                    <select
                      required
                      value={formSurat.jenisSurat}
                      onChange={(e) => setFormSurat(prev => ({ ...prev, jenisSurat: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs cursor-pointer transition-all"
                    >
                      <option value="Surat Panggilan">Surat Panggilan Orang Tua</option>
                      <option value="Surat Kontrak Perilaku">Surat Kontrak Perilaku Siswa</option>
                      <option value="Surat Home Visit">Surat Pemberitahuan Home Visit</option>
                      <option value="Surat Rujukan">Surat Rujukan Penanganan Khusus</option>
                    </select>
                  </div>

                  {/* Nomor Surat */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nomor Surat Resmi *</label>
                    <input
                      type="text"
                      required
                      value={formSurat.nomorSurat}
                      onChange={(e) => setFormSurat(prev => ({ ...prev, nomorSurat: e.target.value }))}
                      placeholder="Nomor agenda surat..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs font-mono"
                    />
                  </div>

                  {/* Perihal */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Subjek / Perihal Surat *</label>
                    <input
                      type="text"
                      required
                      value={formSurat.perihal}
                      onChange={(e) => setFormSurat(prev => ({ ...prev, perihal: e.target.value }))}
                      placeholder="Perihal surat panggilan..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                  >
                    <FileText className="w-4.5 h-4.5 text-white" /> Buat & Tampilan Surat
                  </button>
                </form>
              </div>

              {/* Right Column: Interactive Document Previewer */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Pratinjau Lembaran Surat Resmi Sekolah</h3>
                  {generatedLetter && (
                    <button
                      onClick={handleDownloadSuratDoc}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                      <Download className="w-4 h-4 text-white" /> Unduh Surat (.doc)
                    </button>
                  )}
                </div>

                {!generatedLetter ? (
                  <div className="border border-slate-200 border-dashed rounded-3xl p-16 text-center text-slate-400 italic font-medium text-xs space-y-2 flex flex-col items-center">
                    <FileText className="w-10 h-10 text-slate-300 stroke-1" />
                    <span>Silakan isi formulir parameter di kiri lalu tekan tombol "Buat & Tampilkan Surat" untuk memuat draf legal.</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 text-xs text-slate-800 font-medium leading-relaxed font-serif shadow-inner max-h-[600px] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                    
                    {/* Header Kop Surat UI */}
                    <div className="text-center border-b-2 border-double border-slate-900 pb-4">
                      <h4 className="text-sm font-black font-sans uppercase tracking-tight text-slate-900 leading-tight">YAYASAN ALDIANA NUSANTARA</h4>
                      <h2 className="text-base font-black font-sans uppercase tracking-tight text-slate-900 mt-1">{classNameFilter}</h2>
                      <p className="text-[9.5px] font-sans font-semibold text-slate-800 mt-1 leading-normal">
                        Sistem Integrasi Kesiswaan - Bimbingan dan Konseling<br/>
                        Alamat : Jl. Tarmanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan
                      </p>
                    </div>

                    {/* Metadata block */}
                    <div className="flex flex-col sm:flex-row justify-between gap-2 text-[11px] font-mono font-semibold pt-2">
                      <div className="space-y-0.5">
                        <div><span className="inline-block w-16">Nomor</span>: {generatedLetter.nomorSurat}</div>
                        <div><span className="inline-block w-16">Lampiran</span>: - (Satu Berkas)</div>
                        <div><span className="inline-block w-16 font-bold">Perihal</span>: <strong className="underline text-slate-900">{generatedLetter.perihal}</strong></div>
                      </div>
                      <div className="text-right">
                        <span>Jakarta, {generatedLetter.tanggal}</span>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="space-y-1 text-[11px] font-sans">
                      <p className="font-semibold text-slate-700">Kepada Yth.</p>
                      <p className="font-bold text-slate-900 uppercase">Bapak/Ibu Orang Tua / Wali Murid</p>
                      <p className="font-medium text-slate-600">Dari siswa: <strong className="text-indigo-600">{generatedLetter.namaSiswa.toUpperCase()}</strong> (Kelas {generatedLetter.kelas})</p>
                      <p className="font-semibold text-slate-700">Di tempat</p>
                    </div>

                    {/* Letter Body text */}
                    <div className="space-y-4 text-[11px] text-slate-800 leading-relaxed font-sans text-justify">
                      <p>Dengan hormat,</p>
                      
                      <p>
                        Sehubungan dengan pelaksanaan program pembimbingan kepribadian, ketertiban tata tertib, serta monitoring studi siswa di lingkungan sekolah <strong>{classNameFilter}</strong>, kami mengundang bapak/ibu selaku orang tua/wali murid untuk hadir koordinasi terpadu.
                      </p>

                      <p className="bg-white p-4 rounded-2xl border border-slate-200/80 italic font-medium leading-relaxed text-slate-700 text-center text-[11.5px] shadow-2xs font-serif">
                        "{generatedLetter.bodyText}"
                      </p>

                      <p>Adapun rincian waktu pertemuan dan tempat koordinasi direncanakan sebagai berikut:</p>

                      <div className="pl-6 font-mono space-y-1 text-[10px] text-slate-700">
                        <div>● <span className="inline-block w-28">Hari, Tanggal</span>: Senin Mendatang</div>
                        <div>● <span className="inline-block w-28">Waktu</span>: Pukul 09.00 WIB s.d Selesai</div>
                        <div>● <span className="inline-block w-28">Tempat</span>: Ruang Bimbingan Konseling (BK) Gedung Utama</div>
                        <div>● <span className="inline-block w-28">Koordinator Guru</span>: {currentUser.nama}</div>
                      </div>

                      <p>
                        Mengingat pentingnya agenda koordinasi pembinaan masa depan akademik serta kedisiplinan putra/putri bapak/ibu ini, kehadiran tepat waktu sangat kami harapkan. Atas perhatian, kerja sama, dan komitmen positif bapak/ibu wali murid, kami haturkan banyak terima kasih.
                      </p>
                    </div>

                    {/* Official Sign Off block */}
                    <div className="grid grid-cols-2 gap-4 text-center pt-6 text-[10px] font-sans text-slate-700">
                      <div className="space-y-14">
                        <p>Mengetahui,<br/>Kepala Sekolah / Kesiswaan</p>
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900">( ________________________ )</p>
                          <p className="text-[8px] text-slate-400">NIP. / NUPTK. -</p>
                        </div>
                      </div>

                      <div className="space-y-14">
                        <p>Hormat kami,<br/>Koordinator Pelayanan BK Sekolah</p>
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 underline">{currentUser.nama}</p>
                          <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider">Guru BK Pembimbing</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ================== TAB 6: LAPORAN SNBP ================== */}
        {activeTab === 'snbp' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Input Laporan SNBP */}
              <div className="lg:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Prestasi Alumni & Seleksi</span>
                  <h3 className="font-extrabold text-slate-800 text-sm">Input Laporan SNBP</h3>
                </div>

                <form onSubmit={handleAddSnbp} className="space-y-4 text-xs font-semibold text-slate-700">
                  {/* Student Search Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Siswa / Murid (Dropdown Search) *</label>
                    <SearchableSiswaSelect
                      students={schoolStudents}
                      selectedValue={formSnbp.nis}
                      onChange={(nis) => setFormSnbp(prev => ({ ...prev, nis }))}
                      placeholder="Cari & pilih nama siswa..."
                    />
                    <input type="hidden" name="snbp_siswa_nis" value={formSnbp.nis} required />
                  </div>

                  {/* Keterangan Lulus Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Keterangan Kelulusan (Dropdown) *</label>
                    <select
                      required
                      value={formSnbp.keteranganLulus}
                      onChange={(e) => setFormSnbp(prev => ({ ...prev, keteranganLulus: e.target.value as 'Lulus' | 'Tidak Lulus' }))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs cursor-pointer transition-all"
                    >
                      <option value="Lulus">Lulus</option>
                      <option value="Tidak Lulus">Tidak Lulus</option>
                    </select>
                  </div>

                  {/* Universitas */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Nama Universitas / PTN *</label>
                    <input
                      type="text"
                      required
                      value={formSnbp.namaUniversitas}
                      onChange={(e) => setFormSnbp(prev => ({ ...prev, namaUniversitas: e.target.value }))}
                      placeholder="Contoh: Universitas Indonesia / ITB"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Program Studi */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Program Studi / Jurusan *</label>
                    <input
                      type="text"
                      required
                      value={formSnbp.programStudi}
                      onChange={(e) => setFormSnbp(prev => ({ ...prev, programStudi: e.target.value }))}
                      placeholder="Contoh: Teknik Informatika / Kedokteran"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Tahun Seleksi */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Tahun Seleksi *</label>
                    <input
                      type="text"
                      required
                      value={formSnbp.tahun}
                      onChange={(e) => setFormSnbp(prev => ({ ...prev, tahun: e.target.value }))}
                      placeholder="Contoh: 2026"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  {/* Catatan Tambahan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase block">Catatan Pendukung (Opsional)</label>
                    <textarea
                      value={formSnbp.catatan}
                      onChange={(e) => setFormSnbp(prev => ({ ...prev, catatan: e.target.value }))}
                      placeholder="Peringkat paralel, nilai rata-rata raport, dll..."
                      rows={2}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-medium text-xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Simpan Laporan SNBP
                  </button>
                </form>
              </div>

              {/* Tabel Laporan SNBP */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Daftar Hasil Seleksi SNBP Siswa</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportSnbpPDF}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-white" /> Unduh Laporan PDF
                    </button>
                    <span className="text-[10px] font-bold font-mono text-slate-400">Total: {snbpList.length} siswa</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Siswa / Kelas</th>
                        <th className="py-3 px-4">Tahun</th>
                        <th className="py-3 px-4">Universitas / Prodi</th>
                        <th className="py-3 px-4 text-center">Status Kelulusan</th>
                        <th className="py-3 px-4">Catatan</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                      {snbpList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center italic text-slate-400 font-medium">
                            Belum ada rekam data kelulusan SNBP yang diinput untuk sekolah ini.
                          </td>
                        </tr>
                      ) : (
                        snbpList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              <span className="block font-bold">{item.namaSiswa}</span>
                              <span className="text-[9px] text-slate-400 font-mono">NIS: {item.nis} | {item.kelas}</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold font-mono text-[10px] text-slate-500">
                              {item.tahun}
                            </td>
                            <td className="py-3.5 px-4">
                              <b className="text-slate-800 block text-[11px] mb-0.5">{item.namaUniversitas}</b>
                              <span className="text-indigo-600 text-[10px] font-semibold">{item.programStudi}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                item.keteranganLulus === 'Lulus'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {item.keteranganLulus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 leading-normal max-w-xs font-medium italic text-slate-500">
                              {item.catatan || '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteSnbp(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Laporan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
