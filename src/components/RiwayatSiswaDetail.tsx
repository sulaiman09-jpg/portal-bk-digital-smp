import React, { useState, useEffect, useMemo } from 'react';
import { Siswa, Pencatatan, Pembinaan, Role, ActionPlan, ActionPlanStatus, ActionPlanKategori } from '../types';
import {
  Search,
  UserCheck,
  ShieldAlert,
  Award,
  AlertCircle,
  FileText,
  Trash2,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  PlusCircle,
  Sparkles,
  MessageSquare,
  Edit3,
  Filter,
  AlertTriangle,
  ArrowRight,
  X,
  ChevronRight,
  TrendingUp,
  User
} from 'lucide-react';
import KartuKesiswaan from './KartuKesiswaan';
import { googleSheetApi } from '../services/googleSheetApi';

interface RiwayatSiswaDetailProps {
  siswa: Siswa[];
  pencatatan: Pencatatan[];
  pembinaan: Pembinaan[];
  userRole: Role;
  currentUser?: { nama: string; role: Role };
  onDeleteRecord: (id: string) => Promise<boolean>;
  selectedNisFromOutside?: string; // Support navigating directly from dashboard click
}

// Pre-defined guidance & counseling action plan templates based on real Indonesian school BK standards
const ACTION_PLAN_TEMPLATES: Array<{
  nama: string;
  judul: string;
  kategori: ActionPlanKategori;
  deskripsi: string;
  indikator: string;
  daysAhead: number;
  poin: number;
}> = [
  {
    nama: '⏰ Disiplin Kehadiran 30 Hari',
    judul: 'Program Pemulihan Disiplin Waktu & Absensi',
    kategori: 'Kedisiplinan',
    deskripsi: 'Siswa wajib hadir di sekolah sebelum pukul 06.45 WIB, melapor ke meja Guru Piket setiap pagi untuk absensi mandiri, serta membawa kartu kontrol kehadiran yang diparaf Wali Kelas setiap akhir pekan.',
    indikator: 'Hadir tepat waktu 100% tanpa keterlambatan dan 0 alpa selama 30 hari berturut-turut.',
    daysAhead: 30,
    poin: 15
  },
  {
    nama: '👔 Kerapian Atribut & Seragam',
    judul: 'Program Pembiasaan Standar Kerapian Atribut Sekolah',
    kategori: 'Kerapian',
    deskripsi: 'Pemeriksaan atribut lengkap (dasi, ikat pinggang, kaos kaki, sepatu hitam, baju dimasukkan rapi, potongan rambut sesuai tata tertib) setiap pagi saat apel/masuk kelas oleh Guru BK/Piket.',
    indikator: 'Tertib berpakaian dan rambut rapi sesuai standar sekolah selama 21 hari masa pantau.',
    daysAhead: 21,
    poin: 10
  },
  {
    nama: '🤝 Kontrak Perilaku & Sikap Santun',
    judul: 'Kontrak Komitmen Perilaku Positif & Etika Berkomunikasi',
    kategori: 'Etika & Sikap',
    deskripsi: 'Menjalani 4 sesi konseling individu mingguan bersama Guru BK, menyusun jurnal refleksi harian perilaku positif, dan meminta lembar umpan balik mingguan dari 3 guru mata pelajaran.',
    indikator: 'Tidak ada laporan perilaku tidak santun/membantah guru dan evaluasi positif dari dewan guru.',
    daysAhead: 30,
    poin: 20
  },
  {
    nama: '🚭 Bebas Rokok & Konseling Adiksi',
    judul: 'Program Rehabilitasi Edukasi Bebas Asap Rokok & Vape',
    kategori: 'Sosial & Emosi',
    deskripsi: 'Konseling intensif bahaya adiksi bersama Guru BK, penugasan proyek edukasi kesehatan (membuat infografis antirokok), serta monitoring bersama orang tua di rumah.',
    indikator: 'Tidak membawa/menghisap rokok atau vape di lingkungan sekolah dan komitmen perilaku bersih.',
    daysAhead: 45,
    poin: 25
  },
  {
    nama: '📚 Tanggung Jawab Belajar & KBM',
    judul: 'Peningkatan Tanggung Jawab Akademik & Integritas Belajar',
    kategori: 'Akademik',
    deskripsi: 'Siswa duduk di baris depan kelas, mengumpulkan seluruh tugas mata pelajaran tepat waktu, dan mengikuti bimbingan klasikal bersama konselor sekolah.',
    indikator: 'Semua tugas kelas terselesaikan 100% dan tidak ada catatan meninggalkan kelas saat KBM.',
    daysAhead: 30,
    poin: 15
  }
];

export default function RiwayatSiswaDetail({
  siswa,
  pencatatan,
  pembinaan,
  userRole,
  currentUser,
  onDeleteRecord,
  selectedNisFromOutside
}: RiwayatSiswaDetailProps) {
  
  const [selectedNis, setSelectedNis] = useState(selectedNisFromOutside || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Action Plans States
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedPlanForEval, setSelectedPlanForEval] = useState<ActionPlan | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Semua' | ActionPlanStatus>('Semua');

  // Form states for creating Action Plan
  const [formJudul, setFormJudul] = useState('');
  const [formKategori, setFormKategori] = useState<ActionPlanKategori>('Kedisiplinan');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formIndikator, setFormIndikator] = useState('');
  const [formTenggat, setFormTenggat] = useState('');
  const [formPoinPengurangan, setFormPoinPengurangan] = useState<number>(0);
  const [formPembimbing, setFormPembimbing] = useState(currentUser?.nama || 'Guru BK');
  const [formStatus, setFormStatus] = useState<ActionPlanStatus>('Direncanakan');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Form states for updating evaluation
  const [evalStatus, setEvalStatus] = useState<ActionPlanStatus>('Sedang Berjalan');
  const [evalNote, setEvalNote] = useState('');
  const [isSavingEval, setIsSavingEval] = useState(false);

  // Sync state if selected from dashboard
  useEffect(() => {
    if (selectedNisFromOutside) {
      setSelectedNis(selectedNisFromOutside);
    }
  }, [selectedNisFromOutside]);

  // Load Action Plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      try {
        const res = await googleSheetApi.getActionPlans();
        if (res.success && Array.isArray(res.data)) {
          setActionPlans(res.data);
        }
      } catch (e) {
        console.warn('Gagal mengambil data action plan:', e);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const canManagePlans = userRole === 'Admin' || userRole === 'Guru BK';
  const canDelete = userRole === 'Admin' || userRole === 'Guru BK';

  // 1. Filter dropdown results
  const filteredStudents = siswa.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery) ||
    s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = siswa.find(s => s.nis === selectedNis);

  // 2. Filter records for this student
  const studentRecords = selectedStudent
    ? pencatatan.filter(r => r.nis === selectedStudent.nis).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    : [];

  const studentCoaching = selectedStudent
    ? pembinaan.filter(p => p.nis === selectedStudent.nis).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    : [];

  const totalPoints = studentRecords.reduce((sum, r) => sum + r.poin, 0);

  // 3. Filter Action Plans for selected student
  const studentActionPlans = useMemo(() => {
    if (!selectedStudent) return [];
    return actionPlans.filter(p => p.nis === selectedStudent.nis);
  }, [actionPlans, selectedStudent]);

  const filteredStudentActionPlans = useMemo(() => {
    if (statusFilter === 'Semua') return studentActionPlans;
    return studentActionPlans.filter(p => p.status === statusFilter);
  }, [studentActionPlans, statusFilter]);

  // Metric stats for this student's action plans
  const totalPlansCount = studentActionPlans.length;
  const inProgressPlansCount = studentActionPlans.filter(p => p.status === 'Sedang Berjalan').length;
  const completedPlansCount = studentActionPlans.filter(p => p.status === 'Tercapai').length;
  const successRate = totalPlansCount > 0 ? Math.round((completedPlansCount / totalPlansCount) * 100) : 0;

  // Determine current active coaching (pembinaan) status
  const getCoachingStatus = (poin: number) => {
    if (poin === 0) return { title: 'Siswa Berkelakuan Baik', color: 'bg-emerald-500 text-white', border: 'border-emerald-100', textCol: 'text-emerald-700', bgCol: 'bg-emerald-50' };
    if (poin <= 25) return { title: 'Teguran Lisan', color: 'bg-yellow-500 text-slate-900', border: 'border-yellow-200', textCol: 'text-yellow-700', bgCol: 'bg-yellow-50' };
    if (poin <= 50) return { title: 'Teguran Tertulis', color: 'bg-amber-500 text-white', border: 'border-amber-200', textCol: 'text-amber-700', bgCol: 'bg-amber-50' };
    if (poin <= 75) return { title: 'Pemanggilan Orang Tua', color: 'bg-orange-500 text-white', border: 'border-orange-200', textCol: 'text-orange-700', bgCol: 'bg-orange-50' };
    if (poin <= 100) return { title: 'Surat Peringatan', color: 'bg-red-500 text-white', border: 'border-red-200', textCol: 'text-red-700', bgCol: 'bg-red-50' };
    return { title: 'Sidang Disiplin', color: 'bg-slate-950 text-red-400 border-slate-800', border: 'border-slate-950', textCol: 'text-rose-950', bgCol: 'bg-red-50/70' };
  };

  const currentStatus = getCoachingStatus(totalPoints);

  // Progress Bar scale calculations
  const progressPercent = Math.min((totalPoints / 100) * 100, 100);

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan pelanggaran ini? Poin siswa akan otomatis dikalkulasi ulang.')) {
      await onDeleteRecord(id);
    }
  };

  // Helper for applying preset template in create modal
  const handleApplyTemplate = (tpl: typeof ACTION_PLAN_TEMPLATES[0]) => {
    const d = new Date();
    d.setDate(d.getDate() + tpl.daysAhead);
    const targetDateStr = d.toISOString().split('T')[0];

    setFormJudul(tpl.judul);
    setFormKategori(tpl.kategori);
    setFormDeskripsi(tpl.deskripsi);
    setFormIndikator(tpl.indikator);
    setFormTenggat(targetDateStr);
    setFormPoinPengurangan(tpl.poin);
    setFormStatus('Sedang Berjalan');
    setFormPembimbing(currentUser?.nama || 'Guru BK');
  };

  // Create new action plan
  const handleCreateActionPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!formJudul.trim() || !formDeskripsi.trim()) {
      alert('Judul target dan deskripsi rencana tindak lanjut wajib diisi.');
      return;
    }

    setIsSavingPlan(true);
    try {
      const newPlan: Partial<ActionPlan> = {
        id: 'AP_' + Date.now(),
        nis: selectedStudent.nis,
        namaSiswa: selectedStudent.nama,
        kelas: selectedStudent.kelas,
        judulTarget: formJudul.trim(),
        kategoriTarget: formKategori,
        deskripsiRencana: formDeskripsi.trim(),
        indikatorKeberhasilan: formIndikator.trim(),
        tenggatWaktu: formTenggat || '',
        tanggalDibuat: new Date().toISOString().split('T')[0],
        status: formStatus,
        poinTargetPengurangan: Number(formPoinPengurangan) || 0,
        pembimbing: formPembimbing.trim() || currentUser?.nama || 'Guru BK',
        catatanEvaluasi: ''
      };

      const res = await googleSheetApi.addActionPlan(newPlan);
      if (res.success && Array.isArray(res.data)) {
        setActionPlans(res.data);
      }
      setIsAddModalOpen(false);
      // Reset form
      setFormJudul('');
      setFormDeskripsi('');
      setFormIndikator('');
      setFormTenggat('');
      setFormPoinPengurangan(0);
      setFormStatus('Direncanakan');
    } catch (err) {
      console.error('Error adding action plan:', err);
      alert('Gagal menyimpan rencana tindak lanjut.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Open evaluation updater
  const handleOpenEvalModal = (plan: ActionPlan) => {
    setSelectedPlanForEval(plan);
    setEvalStatus(plan.status);
    setEvalNote('');
    setIsEvalModalOpen(true);
  };

  // Submit evaluation updates
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForEval) return;

    setIsSavingEval(true);
    try {
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const currentNotes = selectedPlanForEval.catatanEvaluasi || '';
      let updatedNotes = currentNotes;
      if (evalNote.trim()) {
        const newEntry = `[${today} - ${currentUser?.nama || 'Guru BK'}] ${evalNote.trim()}`;
        updatedNotes = currentNotes ? `${currentNotes}\n\n${newEntry}` : newEntry;
      }

      const res = await googleSheetApi.updateActionPlan(selectedPlanForEval.id, {
        status: evalStatus,
        catatanEvaluasi: updatedNotes
      });

      if (res.success && Array.isArray(res.data)) {
        setActionPlans(res.data);
      }
      setIsEvalModalOpen(false);
      setSelectedPlanForEval(null);
      setEvalNote('');
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Gagal menyimpan evaluasi perkembangan siswa.');
    } finally {
      setIsSavingEval(false);
    }
  };

  // Delete Action Plan
  const handleDeletePlan = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus target pembinaan / rencana tindak lanjut ini?')) {
      const res = await googleSheetApi.deleteActionPlan(id);
      if (res.success && Array.isArray(res.data)) {
        setActionPlans(res.data);
      }
    }
  };

  // Helper for deadline countdown
  const getDeadlineBadge = (dateStr: string) => {
    if (!dateStr) return { text: 'Belum ditentukan', style: 'bg-slate-100 text-slate-600' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return { text: `Terlewat ${Math.abs(diff)} hari`, style: 'bg-rose-100 text-rose-800 border-rose-200' };
    } else if (diff === 0) {
      return { text: 'Hari ini evaluasi', style: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' };
    } else {
      return { text: `${diff} hari lagi`, style: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: ActionPlanStatus) => {
    switch (status) {
      case 'Direncanakan':
        return { label: 'Direncanakan', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Sedang Berjalan':
        return { label: 'Sedang Berjalan', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Tercapai':
        return { label: 'Tercapai / Selesai', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Perlu Evaluasi Ulang':
        return { label: 'Perlu Evaluasi', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-display">Riwayat & Kartu Pelanggaran Siswa</h2>
          <p className="text-xs text-slate-500 font-sans">Masukkan NIS atau nama siswa untuk memuat kartu digital kesiswaan lengkap</p>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
            <input
              id="search-student-history-input"
              type="text"
              placeholder={selectedStudent ? `${selectedStudent.nama} (${selectedStudent.kelas})` : "Ketik NIS, nama siswa, atau kelas..."}
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="pl-10 pr-4 py-2.5 w-full text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all font-semibold"
            />
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-50">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-xs">
                  Siswa tidak ditemukan.
                </div>
              ) : (
                filteredStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedNis(s.nis);
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center transition-all"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{s.nama}</span>
                      <span className="text-slate-400 font-mono">NIS: {s.nis} | Kelas {s.kelas}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-600 text-[10px]">
                      Pilih
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main detail card displays if student is selected */}
      {!selectedStudent ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">Kartu Pelanggaran Belum Dimuat</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gunakan kolom pencarian di atas untuk memilih siswa dan menampilkan detail poin, riwayat pembinaan, serta target rencana tindak lanjut rehabilitasi.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student details header + points scale */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Biography Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 font-sans">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xl font-display">
                  {selectedStudent.nama.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-lg tracking-tight leading-snug">{selectedStudent.nama}</h3>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono font-extrabold mt-1 inline-block">
                    Kelas {selectedStudent.kelas}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-50 text-xs font-sans space-y-3 pt-2">
                <div className="flex justify-between py-2 text-slate-600">
                  <span>NIS (No Induk Siswa)</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStudent.nis}</span>
                </div>
                <div className="flex justify-between py-3 text-slate-600">
                  <span>Jenis Kelamin</span>
                  <span className="font-bold text-slate-900">{selectedStudent.jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</span>
                </div>
                <div className="flex justify-between py-3 text-slate-600">
                  <span>Nama Orang Tua</span>
                  <span className="font-bold text-slate-900">{selectedStudent.namaOrangTua}</span>
                </div>
                <div className="flex justify-between py-3 text-slate-600">
                  <span>WhatsApp Orang Tua</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStudent.noHp}</span>
                </div>
              </div>
            </div>

            {/* Points & coaching scale panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6 font-sans">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-950 text-base">Status Pembinaan Kesiswaan</h3>
                  <p className="text-xs text-slate-500">Milestone akumulasi poin pelanggaran dan tingkat tindakan sanksi</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block uppercase tracking-wider font-semibold">Total Poin</span>
                  <span className="text-3xl font-black font-mono text-slate-950">{totalPoints}</span>
                </div>
              </div>

              {/* Progress Slider bar */}
              <div className="space-y-3.5 pt-2">
                <div className="relative">
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        totalPoints > 100 ? 'bg-slate-950' :
                        totalPoints > 75 ? 'bg-red-500' :
                        totalPoints > 50 ? 'bg-orange-500' :
                        totalPoints > 25 ? 'bg-amber-500' :
                        totalPoints > 0 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Milestones labels */}
                <div className="grid grid-cols-5 text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono text-center">
                  <div className={totalPoints <= 25 && totalPoints > 0 ? 'text-yellow-600 font-black' : ''}>
                    Lisan
                    <span className="block text-[8px] font-normal font-sans">0-25</span>
                  </div>
                  <div className={totalPoints > 25 && totalPoints <= 50 ? 'text-amber-600 font-black' : ''}>
                    Tertulis
                    <span className="block text-[8px] font-normal font-sans">26-50</span>
                  </div>
                  <div className={totalPoints > 50 && totalPoints <= 75 ? 'text-orange-600 font-black' : ''}>
                    Ortu
                    <span className="block text-[8px] font-normal font-sans">51-75</span>
                  </div>
                  <div className={totalPoints > 75 && totalPoints <= 100 ? 'text-red-600 font-black' : ''}>
                    Peringatan
                    <span className="block text-[8px] font-normal font-sans">76-100</span>
                  </div>
                  <div className={totalPoints > 100 ? 'text-slate-950 font-black' : ''}>
                    Disiplin
                    <span className="block text-[8px] font-normal font-sans">&gt;100</span>
                  </div>
                </div>
              </div>

              {/* Status explanation alert badge */}
              <div className={`p-4 rounded-xl border flex gap-3 ${currentStatus.bgCol} ${currentStatus.border}`}>
                {totalPoints === 0 ? (
                  <Award className="w-6 h-6 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className={`w-6 h-6 shrink-0 ${currentStatus.textCol}`} />
                )}
                <div className="space-y-1">
                  <span className={`text-xs font-black uppercase tracking-wider ${currentStatus.textCol}`}>
                    Rekomendasi Tindakan: {currentStatus.title}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {totalPoints === 0 && 'Siswa berkelakuan sangat baik, tidak memiliki catatan poin sanksi pelanggaran di sekolah.'}
                    {totalPoints > 0 && totalPoints <= 25 && 'Siswa harus diberikan pembinaan berupa Teguran Lisan terstruktur oleh Guru Piket.'}
                    {totalPoints > 25 && totalPoints <= 50 && 'Siswa perlu diberikan Teguran Tertulis resmi yang ditandatangani oleh Guru Piket dan Guru BK.'}
                    {totalPoints > 50 && totalPoints <= 75 && 'Guru BK wajib melayangkan surat panggilan resmi kepada orang tua/wali siswa ke sekolah.'}
                    {totalPoints > 75 && totalPoints <= 100 && 'Kepala Sekolah didampingi BK melayangkan Surat Peringatan (SP) keras untuk siswa bersangkutan.'}
                    {totalPoints > 100 && 'Siswa harus segera dihadapkan pada Sidang Disiplin Dewan Guru untuk penentuan kelanjutan studi.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kartu Digital & Kartu Pelanggaran Section */}
          <KartuKesiswaan siswa={selectedStudent} pencatatan={pencatatan} />

          {/* Ledger logs tables (Violations & Coaching History) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Violations log - taking 2 cols */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4 font-sans">
              <h4 className="font-bold text-slate-800 text-sm font-display">Riwayat Kejadian Pelanggaran</h4>
              
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jenis Pelanggaran</th>
                      <th className="py-2.5 px-3 w-16 text-center">Poin</th>
                      <th className="py-2.5 px-3">Petugas BK</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3">Foto Bukti</th>
                      {canDelete && <th className="py-2.5 px-3 w-12 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600 text-xs">
                    {studentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={canDelete ? 7 : 6} className="py-10 text-center italic text-slate-400">
                          Siswa bersih dari riwayat pelanggaran.
                        </td>
                      </tr>
                    ) : (
                      studentRecords.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-mono text-slate-500 font-semibold">{record.tanggal}</td>
                          <td className="py-3 px-3 font-bold text-slate-800">{record.pelanggaran}</td>
                          <td className="py-3 px-3 text-center font-mono font-black text-rose-600 text-sm">+{record.poin}</td>
                          <td className="py-3 px-3 text-slate-500 font-medium">{record.petugas}</td>
                          <td className="py-3 px-3 italic max-w-xs truncate" title={record.keterangan}>
                            {record.keterangan || '-'}
                          </td>
                          <td className="py-3 px-3">
                            {record.foto ? (
                              <div className="relative group/photo inline-block">
                                <img
                                  src={record.foto}
                                  alt="Bukti"
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 transition-all duration-300 hover:scale-[3.0] hover:translate-x-[-12px] hover:translate-y-[-12px] hover:z-50 relative cursor-zoom-in"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          {canDelete && (
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="Batalkan/Hapus Kasus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Coaching intervention history logs - taking 1 col */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
              <h4 className="font-bold text-slate-800 text-sm font-display">Riwayat Pembinaan Resmi</h4>
              
              <div className="space-y-3">
                {studentCoaching.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic text-xs">
                    Belum ada riwayat surat tindakan pembinaan terbit.
                  </div>
                ) : (
                  studentCoaching.map(coaching => (
                    <div key={coaching.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>{coaching.tanggal}</span>
                        <span className="font-semibold">Kode ID: {coaching.id}</span>
                      </div>
                      
                      <span className="text-xs font-bold text-slate-800 block">{coaching.tindakan}</span>
                      
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span>Bobot Kumulatif:</span>
                        <span className="font-mono font-bold text-slate-900">{coaching.totalPoin} Poin</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FITUR BARU: TARGET PEMBINAAN & RENCANA TINDAK LANJUT (ACTION PLAN REHABILITASI) */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 font-sans">
            {/* Header Title & Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Target Pembinaan & Rencana Tindak Lanjut (Action Plan)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Rencana intervensi perilaku terukur dan milestone pemulihan karakter bagi <strong className="text-slate-700">{selectedStudent.nama}</strong>.
                </p>
              </div>

              {canManagePlans && (
                <button
                  id="btn-add-action-plan"
                  onClick={() => {
                    setFormPembimbing(currentUser?.nama || 'Guru BK');
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <PlusCircle className="w-4 h-4" /> Tambah Action Plan
                </button>
              )}
            </div>

            {/* Quick Rehabilitation Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-slate-500 block">Total Target Direncanakan</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-slate-900">{totalPlansCount}</span>
                  <span className="text-xs text-slate-500">Program</span>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-amber-700 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Sedang Berjalan
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-amber-900">{inProgressPlansCount}</span>
                  <span className="text-xs text-amber-700">Aktif Dipantau</span>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-emerald-700 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Berhasil Tercapai
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-900">{completedPlansCount}</span>
                  <span className="text-xs text-emerald-700">Selesai</span>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-semibold text-blue-700 block flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Tingkat Keberhasilan
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-blue-900">{successRate}%</span>
                  <span className="text-xs text-blue-700">Rehabilitasi</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                {(['Semua', 'Sedang Berjalan', 'Direncanakan', 'Tercapai', 'Perlu Evaluasi Ulang'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Menampilkan {filteredStudentActionPlans.length} dari {totalPlansCount} rencana
              </span>
            </div>

            {/* List of Action Plans */}
            <div className="space-y-4">
              {filteredStudentActionPlans.length === 0 ? (
                <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-xs border border-slate-100">
                    <Target className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">
                      {statusFilter === 'Semua' ? 'Belum Ada Target Pembinaan' : `Tidak Ada Rencana Status "${statusFilter}"`}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Setelah mencermati riwayat pelanggaran siswa di atas, susunlah target intervensi terukur agar proses rehabilitasi dan perbaikan kedisiplinan siswa dapat dipantau berkala.
                    </p>
                  </div>
                  {canManagePlans && statusFilter === 'Semua' && (
                    <button
                      onClick={() => {
                        setFormPembimbing(currentUser?.nama || 'Guru BK');
                        setIsAddModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Buat Target Pembinaan Pertama
                    </button>
                  )}
                </div>
              ) : (
                filteredStudentActionPlans.map(plan => {
                  const statusInfo = getStatusBadge(plan.status);
                  const deadlineInfo = getDeadlineBadge(plan.tenggatWaktu);

                  return (
                    <div
                      key={plan.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        plan.status === 'Tercapai'
                          ? 'bg-emerald-50/20 border-emerald-200/70'
                          : plan.status === 'Perlu Evaluasi Ulang'
                          ? 'bg-rose-50/20 border-rose-200/70'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          {/* Tags row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 font-mono">
                              {plan.kategoriTarget}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.bg}`}>
                              {statusInfo.label}
                            </span>
                            {plan.poinTargetPengurangan && plan.poinTargetPengurangan > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                                Insentif: -{plan.poinTargetPengurangan} Poin Sanksi
                              </span>
                            ) : null}
                          </div>

                          {/* Title */}
                          <h4 className="text-base font-bold text-slate-900 leading-snug">
                            {plan.judulTarget}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                            {plan.deskripsiRencana}
                          </p>
                        </div>

                        {/* Top-Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenEvalModal(plan)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Evaluasi & Catatan
                          </button>
                          {canManagePlans && (
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Action Plan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Measurable Indicator & Timeline Box */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Indikator Keberhasilan Terukur:
                          </span>
                          <p className="text-slate-800 font-medium">
                            {plan.indikatorKeberhasilan || 'Mengikuti pembinaan berkala secara tertib.'}
                          </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                              <Calendar className="w-3 h-3 text-blue-500" /> Target Tenggat Waktu:
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-bold border text-[9px] ${deadlineInfo.style}`}>
                              {deadlineInfo.text}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-slate-800">
                              {plan.tenggatWaktu || 'Tidak ada batas waktu'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Pembimbing: <strong className="text-slate-700">{plan.pembimbing}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Evaluation / Monitoring Notes Section */}
                      {plan.catatanEvaluasi && (
                        <div className="mt-3.5 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Jurnal Perkembangan & Catatan Evaluasi Konselor:
                          </span>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                            {plan.catatanEvaluasi}
                          </p>
                          {plan.tanggalEvaluasiTerakhir && (
                            <span className="text-[10px] text-slate-400 block pt-1 font-sans">
                              Pembaruan terakhir: {plan.tanggalEvaluasiTerakhir}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH TARGET PEMBINAAN & ACTION PLAN BARU */}
      {/* ========================================================================= */}
      {isAddModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Tambah Target Pembinaan (Action Plan)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Untuk siswa: <strong className="text-slate-800">{selectedStudent.nama}</strong> ({selectedStudent.kelas} - NIS: {selectedStudent.nis})
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="space-y-2 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Rekomendasi Template Rencana Aksi Cepat (Berdasarkan Standar BK):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ACTION_PLAN_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="px-2.5 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left"
                  >
                    {tpl.nama}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateActionPlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Judul Target Pembinaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Program Pemulihan Disiplin Waktu & Absensi"
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Fokus Kategori</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as ActionPlanKategori)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="Kedisiplinan">Kedisiplinan</option>
                    <option value="Kerapian">Kerapian</option>
                    <option value="Etika & Sikap">Etika & Sikap</option>
                    <option value="Akademik">Akademik</option>
                    <option value="Sosial & Emosi">Sosial & Emosi</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Langkah Rencana Tindak Lanjut (Action Plan) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan langkah konkret, penugasan positif, atau sesi bimbingan berkala yang harus dijalani siswa..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Indikator Keberhasilan yang Terukur
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 0 keterlambatan dan 0 alpa selama 30 hari berturut-turut"
                  value={formIndikator}
                  onChange={(e) => setFormIndikator(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Target Tanggal Evaluasi</label>
                  <input
                    type="date"
                    value={formTenggat}
                    onChange={(e) => setFormTenggat(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Insentif Pemulihan Poin
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={formPoinPengurangan || ''}
                    onChange={(e) => setFormPoinPengurangan(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block">Poin sanksi berkurang jika tercapai</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Guru Pembimbing / Penanggung Jawab</label>
                  <input
                    type="text"
                    value={formPembimbing}
                    onChange={(e) => setFormPembimbing(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSavingPlan ? 'Menyimpan...' : 'Simpan Rencana Tindak Lanjut'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE EVALUASI & STATUS PERKEMBANGAN ACTION PLAN */}
      {/* ========================================================================= */}
      {isEvalModalOpen && selectedPlanForEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Evaluasi Perkembangan Target
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {selectedPlanForEval.judulTarget}
                </p>
              </div>
              <button
                onClick={() => setIsEvalModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Status Capaian Target Saat Ini
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Direncanakan', 'Sedang Berjalan', 'Tercapai', 'Perlu Evaluasi Ulang'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEvalStatus(st)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        evalStatus === st
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span>{st}</span>
                      {evalStatus === st && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Tambah Catatan Progres / Evaluasi Konselor
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan hasil pengamatan, perubahan perilaku siswa, catatan sesi konseling, atau masukan dari wali kelas..."
                  value={evalNote}
                  onChange={(e) => setEvalNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {selectedPlanForEval.catatanEvaluasi && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 max-h-36 overflow-y-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Riwayat Catatan Sebelumnya:</span>
                  <p className="text-slate-700 font-mono text-[11px] whitespace-pre-line">
                    {selectedPlanForEval.catatanEvaluasi}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEval}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEval ? 'Menyimpan...' : 'Simpan Evaluasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
