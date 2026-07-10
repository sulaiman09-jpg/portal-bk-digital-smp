import React, { useState, useEffect } from 'react';
import { Siswa, Pelanggaran, Pencatatan, User } from '../types';
import LayananBK from './LayananBK';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  PlusCircle, 
  FileText, 
  Download, 
  Calendar, 
  UserCheck, 
  Image, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  FileDown,
  UserX,
  AlertCircle,
  Sparkles,
  Award,
  Heart,
  GraduationCap,
  Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const belongsToSchool = (studentKelas: string, schoolFilter: string): boolean => {
  if (!studentKelas) return false;
  const k = studentKelas.toUpperCase().trim();
  const sf = schoolFilter.toUpperCase().trim();
  
  if (k === sf) return true;
  
  if (sf === 'SMP NUSANTARA PLUS') {
    if (k.includes('SMP')) return true;
    const isSmpGrade = /^(7|8|9|VII|VIII|IX)\b/.test(k);
    if (isSmpGrade && !k.includes('SMA') && !k.includes('SMK')) return true;
    // Default seed classes
    const defaultSmpClasses = ['7-A', '7-C', '8-A', '8-B', '9-A', '9-B'];
    if (defaultSmpClasses.includes(studentKelas)) return true;
  }
  
  if (sf === 'SMA NUSANTARA PLUS') {
    if (k.includes('SMA') || k.includes('IPA') || k.includes('IPS') || k.includes('MIPA')) {
      if (!k.includes('SMK')) return true;
    }
    const isSmaGrade = /^(10|11|12|X|XI|XII)\b/.test(k);
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

interface RuangKelasProps {
  siswa: Siswa[];
  violations: Pelanggaran[];
  pencatatan: Pencatatan[];
  currentUser: User;
  onAddStudent: (student: Omit<Siswa, 'id'> & { id?: string }) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onAddRecord: (record: {
    nis: string;
    pelanggaran: string;
    tanggal: string;
    petugas: string;
    keterangan: string;
    foto?: string;
    poin?: number;
  }) => Promise<boolean>;
  classNameFilter: string;
}

export default function RuangKelas({
  siswa,
  violations,
  pencatatan,
  currentUser,
  onAddStudent,
  onDeleteStudent,
  onAddRecord,
  classNameFilter
}: RuangKelasProps) {
  
  // Filter students to only those in the current class or belonging to this school
  const classStudents = siswa.filter(s => s.kelas === classNameFilter || belongsToSchool(s.kelas, classNameFilter));

  // Filter records to only those for students in this class
  const studentNisList = classStudents.map(s => s.nis);
  const classRecords = pencatatan
    .filter(r => studentNisList.includes(r.nis))
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // ------------------ 1. INPUT DATA SISWA STATES & LOGIC ------------------
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalTitle, setStudentModalTitle] = useState('Tambah Siswa');
  const [studentFormError, setStudentFormError] = useState('');
  const [studentFormState, setStudentFormState] = useState<Omit<Siswa, 'id'> & { id?: string }>({
    nis: '',
    nama: '',
    kelas: classNameFilter, // locked to current class
    jk: 'L',
    namaOrangTua: '',
    noHp: '',
    foto: ''
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync class filter when props change
  useEffect(() => {
    setStudentFormState(prev => ({ ...prev, kelas: classNameFilter }));
  }, [classNameFilter]);

  const getSearchScore = (name: string, nis: string, kelas: string, query: string) => {
    if (!query) return 0;
    const n = name.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    
    if (nis === q) return 4;
    if (n.startsWith(q)) return 3;
    
    const words = n.split(/\s+/);
    if (words.some(word => word.startsWith(q))) return 2;
    if (n.includes(q) || nis.includes(q) || kelas.toLowerCase().includes(q)) return 1;
    
    return 0;
  };

  const filteredClassStudents = classStudents
    .filter(student => {
      const qNameNis = studentSearchTerm.toLowerCase().trim();
      const qClass = classSearchTerm.toLowerCase().trim();

      const matchesNameOrNis = !qNameNis || (
        student.nama.toLowerCase().includes(qNameNis) ||
        student.nis.includes(qNameNis) ||
        student.kelas.toLowerCase().includes(qNameNis)
      );

      const matchesClass = !qClass || (
        student.kelas.toLowerCase().includes(qClass)
      );

      return matchesNameOrNis && matchesClass;
    })
    .sort((a, b) => {
      const scoreA = getSearchScore(a.nama, a.nis, a.kelas, studentSearchTerm);
      const scoreB = getSearchScore(b.nama, b.nis, b.kelas, studentSearchTerm);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.nama.localeCompare(b.nama);
    });

  const handleOpenAddStudent = () => {
    setStudentModalTitle(`Tambah Siswa - ${classNameFilter}`);
    setStudentFormState({
      nis: '',
      nama: '',
      kelas: classNameFilter,
      jk: 'L',
      namaOrangTua: '',
      noHp: '',
      foto: ''
    });
    setStudentFormError('');
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: Siswa) => {
    setStudentModalTitle(`Ubah Data Siswa - ${classNameFilter}`);
    setStudentFormState({
      ...student,
      foto: student.foto || ''
    });
    setStudentFormError('');
    setIsStudentModalOpen(true);
  };

  const handleStudentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setStudentFormState(prev => ({ ...prev, foto: compressedBase64 }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormError('');

    if (!studentFormState.nis.trim() || !studentFormState.nama.trim() || !studentFormState.namaOrangTua.trim() || !studentFormState.noHp.trim()) {
      setStudentFormError('Semua kolom wajib diisi.');
      return;
    }

    if (!/^\d+$/.test(studentFormState.nis)) {
      setStudentFormError('NIS harus berupa angka.');
      return;
    }

    if (!/^\d+$/.test(studentFormState.noHp)) {
      setStudentFormError('Nomor HP harus berupa angka.');
      return;
    }

    const success = await onAddStudent(studentFormState);
    if (success) {
      setIsStudentModalOpen(false);
    } else {
      setStudentFormError('Gagal menyimpan data siswa. NIS mungkin telah digunakan.');
    }
  };

  const handleStudentDelete = async (id: string) => {
    const success = await onDeleteStudent(id);
    if (success) {
      setConfirmDeleteId(null);
    }
  };

  // ------------------ 2. CATATAN PELANGGARAN STATES & LOGIC ------------------
  const [activeFormTab, setActiveFormTab] = useState<'pelanggaran' | 'remisi'>('pelanggaran');

  const [selectedNis, setSelectedNis] = useState('');
  const [selectedViolationName, setSelectedViolationName] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [petugas, setPetugas] = useState(currentUser.nama || '');
  const [keterangan, setKeterangan] = useState('');
  const [recordFoto, setRecordFoto] = useState('');
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');
  const [isSiswaDropdownOpen, setIsSiswaDropdownOpen] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Remisi Poin states
  const [remisiNis, setRemisiNis] = useState('');
  const [remisiPoin, setRemisiPoin] = useState(10);
  const [remisiTanggal, setRemisiTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [remisiPetugas, setRemisiPetugas] = useState(currentUser.nama || '');
  const [remisiKeterangan, setRemisiKeterangan] = useState('');
  const [searchRemisiSiswaQuery, setSearchRemisiSiswaQuery] = useState('');
  const [isRemisiSiswaDropdownOpen, setIsRemisiSiswaDropdownOpen] = useState(false);
  const [remisiSuccess, setRemisiSuccess] = useState(false);
  const [remisiError, setRemisiError] = useState('');
  const [isSubmittingRemisi, setIsSubmittingRemisi] = useState(false);

  // Pre-fill fields
  useEffect(() => {
    if (currentUser) {
      setPetugas(currentUser.nama);
      setRemisiPetugas(currentUser.nama);
    }
  }, [currentUser]);

  // Reset selected student if we switch class
  useEffect(() => {
    setSelectedNis('');
    setSelectedViolationName('');
    setKeterangan('');
    setRecordFoto('');
    setSearchSiswaQuery('');

    setRemisiNis('');
    setRemisiKeterangan('');
    setSearchRemisiSiswaQuery('');
  }, [classNameFilter]);

  const selectedStudentObj = classStudents.find(s => s.nis === selectedNis);
  const selectedViolationObj = violations.find(v => v.namaPelanggaran === selectedViolationName);

  const selectedRemisiStudentObj = classStudents.find(s => s.nis === remisiNis);

  const filteredStudentsDropdown = classStudents
    .filter(s => {
      if (!searchSiswaQuery.trim()) return true;
      const q = searchSiswaQuery.toLowerCase().trim();
      return (
        s.nama.toLowerCase().includes(q) ||
        s.nis.includes(q)
      );
    })
    .sort((a, b) => {
      const scoreA = getSearchScore(a.nama, a.nis, a.kelas, searchSiswaQuery);
      const scoreB = getSearchScore(b.nama, b.nis, b.kelas, searchSiswaQuery);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.nama.localeCompare(b.nama);
    });

  const filteredRemisiStudentsDropdown = classStudents
    .filter(s => {
      if (!searchRemisiSiswaQuery.trim()) return true;
      const q = searchRemisiSiswaQuery.toLowerCase().trim();
      return (
        s.nama.toLowerCase().includes(q) ||
        s.nis.includes(q)
      );
    })
    .sort((a, b) => {
      const scoreA = getSearchScore(a.nama, a.nis, a.kelas, searchRemisiSiswaQuery);
      const scoreB = getSearchScore(b.nama, b.nis, b.kelas, searchRemisiSiswaQuery);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.nama.localeCompare(b.nama);
    });

  // Helper to calculate total points for a student
  const getStudentCurrentPoints = (nisStr: string) => {
    const studentRecords = pencatatan.filter(r => r.nis === nisStr);
    return Math.max(0, studentRecords.reduce((sum, r) => sum + r.poin, 0));
  };

  const getCategoryFromPoints = (pts: number) => {
    if (pts === 0) return { label: 'Aman / Berkelakuan Baik', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pts <= 25) return { label: 'Teguran Lisan', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (pts <= 50) return { label: 'Teguran Tertulis', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    if (pts <= 75) return { label: 'Pemanggilan Orang Tua', color: 'text-red-700 bg-red-50 border-red-200' };
    if (pts <= 100) return { label: 'Surat Peringatan', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    return { label: 'Sidang Disiplin', color: 'text-purple-700 bg-purple-50 border-purple-200' };
  };

  const handleRecordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setRecordFoto(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordError('');
    setRecordSuccess(false);

    if (!selectedNis) {
      setRecordError('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    if (!selectedViolationName) {
      setRecordError('Silakan pilih jenis pelanggaran.');
      return;
    }
    if (!petugas.trim()) {
      setRecordError('Nama guru/petugas pencatat wajib diisi.');
      return;
    }

    setIsSubmittingRecord(true);
    const success = await onAddRecord({
      nis: selectedNis,
      pelanggaran: selectedViolationName,
      tanggal,
      petugas,
      keterangan,
      foto: recordFoto
    });
    setIsSubmittingRecord(false);

    if (success) {
      setRecordSuccess(true);
      // Reset form fields
      setSelectedNis('');
      setSelectedViolationName('');
      setKeterangan('');
      setRecordFoto('');
      setSearchSiswaQuery('');
      
      setTimeout(() => {
        setRecordSuccess(false);
      }, 5000);
    } else {
      setRecordError('Gagal mencatatkan pelanggaran baru.');
    }
  };

  const handleRemisiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemisiError('');
    setRemisiSuccess(false);

    if (!remisiNis) {
      setRemisiError('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    if (remisiPoin <= 0) {
      setRemisiError('Jumlah poin remisi harus lebih besar dari 0.');
      return;
    }
    if (!remisiPetugas.trim()) {
      setRemisiError('Nama guru/petugas pemberi remisi wajib diisi.');
      return;
    }
    if (!remisiKeterangan.trim()) {
      setRemisiError('Alasan pemberian remisi wajib diisi.');
      return;
    }

    setIsSubmittingRemisi(true);
    const success = await onAddRecord({
      nis: remisiNis,
      pelanggaran: `Remisi Poin: ${remisiKeterangan}`,
      tanggal: remisiTanggal,
      petugas: remisiPetugas,
      keterangan: `Pemberian remisi pengurangan poin sebesar -${remisiPoin} poin. Alasan: ${remisiKeterangan}`,
      poin: -remisiPoin
    });
    setIsSubmittingRemisi(false);

    if (success) {
      setRemisiSuccess(true);
      // Reset form fields
      setRemisiNis('');
      setRemisiKeterangan('');
      setSearchRemisiSiswaQuery('');
      
      setTimeout(() => {
        setRemisiSuccess(false);
      }, 5000);
    } else {
      setRemisiError('Gagal memproses pemberian remisi poin.');
    }
  };

  // ------------------ 3. PDF GENERATION EXPORTER ------------------
  const handleDownloadPDF = (student: Siswa, isIndividual: boolean, specificRecord?: Pencatatan) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const startX = 20;
    let currentY = 20;

    // Header KOP SURAT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('YAYASAN ALDIANA NUSANTARA', 105, currentY, { align: 'center' });
    currentY += 5;
    
    // Determine dynamic school name
    let schoolName = 'SMP NUSANTARA PLUS';
    if (student.kelas.includes('SMP')) {
      schoolName = 'SMP NUSANTARA PLUS';
    } else if (student.kelas.includes('SMA')) {
      schoolName = 'SMA NUSANTARA PLUS';
    } else if (student.kelas.includes('SMK-1') || student.kelas.includes('SMK 1') || student.kelas.includes('9') || student.kelas.includes('10') || student.kelas.includes('11') || student.kelas.includes('12')) {
      // fallback or check specific
      if (student.kelas.toLowerCase().includes('smk 2') || student.kelas.toLowerCase().includes('smk-2') || student.kelas.toLowerCase().includes('kesehatan') || student.kelas.toLowerCase().includes('far') || student.kelas.toLowerCase().includes('kep')) {
        schoolName = 'SMK 2 KESEHATAN';
      } else if (student.kelas.toLowerCase().includes('smk 1') || student.kelas.toLowerCase().includes('smk-1')) {
        schoolName = 'SMK NUSANTARA 1';
      }
    }
    
    doc.setFontSize(14);
    doc.text(schoolName, 105, currentY, { align: 'center' });
    currentY += 5;
    
    doc.setFontSize(10);
    doc.text('Sistem Integrasi Kesiswaan - Bimbingan dan Konseling', 105, currentY, { align: 'center' });
    currentY += 4.5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Alamat : Jl. Tarumanegara Dalam 1 Ciputat Timur Kota Tangerang Selatan - Banten.', 105, currentY, { align: 'center' });
    currentY += 3.5;

    // Line dividers
    doc.setLineWidth(0.8);
    doc.line(20, currentY, 190, currentY);
    doc.setLineWidth(0.2);
    doc.line(20, currentY + 1, 190, currentY + 1);
    currentY += 10;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleText = isIndividual 
      ? 'SURAT KETERANGAN CATATAN PELANGGARAN SISWA (INDIVIDUAL)'
      : 'SURAT KETERANGAN REKAPITULASI PELANGGARAN TATA TERTIB';
    doc.text(titleText, 105, currentY, { align: 'center' });
    currentY += 10;

    // Student identity info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('IDENTITAS SISWA:', startX, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    const details = [
      { label: 'Nama Siswa', val: student.nama },
      { label: 'Nomor Induk Siswa (NIS)', val: student.nis },
      { label: 'Kelas / Ruang', val: student.kelas },
      { label: 'Jenis Kelamin', val: student.jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)' },
      { label: 'Nama Orang Tua / Wali', val: student.namaOrangTua },
      { label: 'No. HP Kontak Ortu', val: student.noHp }
    ];

    details.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, startX, currentY);
      doc.text(':', startX + 50, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(item.val, startX + 53, currentY);
      currentY += 5.5;
    });

    currentY += 4;

    if (isIndividual && specificRecord) {
      // Individual report
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL KASUS PELANGGARAN:', startX, currentY);
      currentY += 6;

      const incidentDetails = [
        { label: 'Tanggal Kejadian', val: specificRecord.tanggal },
        { label: 'Deskripsi Pelanggaran', val: specificRecord.pelanggaran },
        { label: 'Bobot Poin Sanksi', val: `+${specificRecord.poin} Poin` },
        { label: 'Petugas / Guru BK', val: specificRecord.petugas },
        { label: 'Keterangan Kronologi', val: specificRecord.keterangan || '-' }
      ];

      incidentDetails.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, startX, currentY);
        doc.text(':', startX + 50, currentY);
        doc.setFont('helvetica', 'normal');

        if (item.label === 'Keterangan Kronologi') {
          const lines = doc.splitTextToSize(item.val, 115);
          doc.text(lines, startX + 53, currentY);
          currentY += (lines.length * 5) + 2;
        } else {
          doc.text(item.val, startX + 53, currentY);
          currentY += 5.5;
        }
      });

    } else {
      // Entire history ledger
      doc.setFont('helvetica', 'bold');
      doc.text('DAFTAR RIWAYAT PELANGGARAN TATA TERTIB SISWA:', startX, currentY);
      currentY += 6;

      // Table Header
      doc.setFontSize(9);
      doc.setFillColor(245, 245, 245);
      doc.rect(startX, currentY, 170, 6.5, 'F');
      doc.rect(startX, currentY, 170, 6.5, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.text('Tanggal', startX + 2, currentY + 4.5);
      doc.text('Nama Pelanggaran', startX + 25, currentY + 4.5);
      doc.text('Poin', startX + 115, currentY + 4.5);
      doc.text('Guru Pencatat', startX + 130, currentY + 4.5);

      currentY += 6.5;
      doc.setFont('helvetica', 'normal');

      const studentAllRecords = pencatatan.filter(r => r.nis === student.nis);

      if (studentAllRecords.length === 0) {
        doc.text('Siswa ini tercatat bersih dari semua jenis pelanggaran.', startX + 5, currentY + 5);
        currentY += 10;
      } else {
        studentAllRecords.forEach(rec => {
          if (currentY > 245) {
            doc.addPage();
            currentY = 20;
          }

          doc.text(rec.tanggal, startX + 2, currentY + 4);
          
          const textLines = doc.splitTextToSize(rec.pelanggaran, 85);
          doc.text(textLines, startX + 25, currentY + 4);

          doc.text(`+${rec.poin}`, startX + 115, currentY + 4);
          
          const truncOfficer = rec.petugas.length > 20 ? rec.petugas.substring(0, 18) + '..' : rec.petugas;
          doc.text(truncOfficer, startX + 130, currentY + 4);

          const rHeight = Math.max(textLines.length * 4.5, 6.5);
          doc.rect(startX, currentY, 170, rHeight, 'S');
          currentY += rHeight;
        });
      }

      currentY += 6;
      const totalPoinVal = studentAllRecords.reduce((s, r) => s + r.poin, 0);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`TOTAL POIN SANKSI SEMENTARA: ${totalPoinVal} Poin`, startX, currentY);
      currentY += 5;

      // Status rekomendasi pembinaan
      let recommendation = 'Berkelakuan Baik (Aman)';
      let actionPlan = 'Pertahankan perilaku disiplin dan patuhi peraturan sekolah.';
      if (totalPoinVal > 100) {
        recommendation = 'Sidang Disiplin Dewan Sekolah';
        actionPlan = 'Rapat panel khusus dewan guru untuk menentukan status kepindahan atau drop-out.';
      } else if (totalPoinVal > 75) {
        recommendation = 'Surat Peringatan Resmi (SP)';
        actionPlan = 'Surat Peringatan tertulis keras yang ditandatangani Kepala Sekolah dilayangkan.';
      } else if (totalPoinVal > 50) {
        recommendation = 'Pemanggilan Orang Tua / Wali';
        actionPlan = 'Mengundang orang tua ke sekolah untuk konferensi bimbingan konseling.';
      } else if (totalPoinVal > 25) {
        recommendation = 'Teguran Tertulis Resmi';
        actionPlan = 'Diterbitkan surat peringatan tertulis yang wajib ditandatangani siswa & BK.';
      } else if (totalPoinVal > 0) {
        recommendation = 'Teguran Lisan Terbimbing';
        actionPlan = 'Konseling tatap muka langsung bersama guru BK atau wali kelas.';
      }

      doc.text(`Rekomendasi Tindakan: ${recommendation}`, startX, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'italic');
      doc.text(`Langkah Lanjutan: ${actionPlan}`, startX, currentY);
      currentY += 15;
    }

    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    const signBlockY = currentY + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text('Orang Tua / Wali Siswa,', startX + 5, signBlockY);
    doc.line(startX + 5, signBlockY + 18, startX + 50, signBlockY + 18);
    doc.text('( ____________________ )', startX + 5, signBlockY + 22);

    doc.text('Guru BK / Petugas Kesiswaan,', startX + 115, signBlockY);
    doc.line(startX + 115, signBlockY + 18, startX + 160, signBlockY + 18);
    doc.text(`( ${isIndividual && specificRecord ? specificRecord.petugas : 'Sulaiman, S.Psi.'} )`, startX + 115, signBlockY + 22);

    const fName = isIndividual && specificRecord
      ? `Surat_Pelanggaran_${student.nis}_${specificRecord.tanggal}.pdf`
      : `Rekap_Pelanggaran_${student.nis}.pdf`;
    
    doc.save(fName);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title block */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-md border border-blue-800">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-white">
          RUANG KELAS: {classNameFilter}
        </h1>
        <p className="text-xs md:text-sm text-blue-200 mt-1 max-w-2xl leading-relaxed">
          Ruang kontrol administrasi khusus untuk {classNameFilter}. Kelola daftar database siswa internal, catatkan laporan pelanggaran secara langsung, dan cetak lembaran sanksi formal dalam format PDF.
        </p>
      </div>

      {/* Grid layouts: Two pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pillar 1: INPUT DATA SISWA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  1. Data Diri & Siswa Kelas
                </h3>
                <p className="text-[11px] text-slate-500">Kelola dan input daftar murid yang aktif di {classNameFilter}</p>
              </div>
              <button
                onClick={handleOpenAddStudent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" /> Tambah Siswa
              </button>
            </div>

            {/* Search Controls (Integrated Student & Class Search) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Search by Name/NIS */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="Cari nama atau NIS siswa..."
                  className="pl-9 pr-4 py-2 w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-semibold transition-all shadow-2xs"
                />
              </div>

              {/* Search by Class (Format Teks) */}
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  placeholder="Cari kelas (cth: 9-A, VII-B)..."
                  className="pl-9 pr-8 py-2 w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-semibold transition-all shadow-2xs"
                />
                {classSearchTerm && (
                  <button
                    onClick={() => setClassSearchTerm('')}
                    className="absolute right-3 top-2 w-4 h-4 text-slate-400 hover:text-slate-600 font-extrabold text-sm flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Students List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2 px-3">NIS</th>
                    <th className="py-2 px-3">Nama Lengkap</th>
                    <th className="py-2 px-3">Kelas</th>
                    <th className="py-2 px-3 text-center">JK</th>
                    <th className="py-2 px-3">No. HP Orang Tua</th>
                    <th className="py-2 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                  {filteredClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center italic text-slate-400">
                        Belum ada siswa terdaftar di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    filteredClassStudents.map(std => (
                      <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{std.nis}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {std.foto ? (
                              <img src={std.foto} alt="" className="w-6 h-6 object-cover rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500">
                                {std.nama.substring(0, 1)}
                              </div>
                            )}
                            <span className="font-bold text-slate-800">{std.nama}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px] uppercase font-mono border border-blue-100/60">
                            {std.kelas}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold text-[11px] text-slate-500">{std.jk}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono">{std.noHp}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditStudent(std)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                              title="Ubah Data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(std.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Hapus Murid"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-400 italic pt-2 font-medium font-mono text-right">
            Menampilkan {filteredClassStudents.length} dari {classStudents.length} total siswa kelas
          </div>
        </div>

        {/* Pillar 2: FORMULIR KESISWAAN (CATATAN PELANGGARAN & REMISI POIN) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                2. Layanan Konseling & Sanksi
              </h3>
              <p className="text-[11px] text-slate-500">Catat kasus pelanggaran murid baru atau input pemberian remisi pengurangan poin sanksi</p>
            </div>
            
            {/* Dynamic Form Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveFormTab('pelanggaran')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFormTab === 'pelanggaran'
                    ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Pelanggaran
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('remisi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFormTab === 'remisi'
                    ? 'bg-white text-emerald-600 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Remisi Poin
              </button>
            </div>
          </div>

          {/* TAB 1: FORMULIR CATATAN PELANGGARAN */}
          {activeFormTab === 'pelanggaran' && (
            <>
              {recordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in duration-350">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Sukses Menyimpan Kasus!</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Laporan pelanggaran siswa berhasil disimpan ke lembar kesiswaan. Poin dan rekomendasi pembinaan siswa langsung terupdate.
                    </p>
                  </div>
                </div>
              )}

              {recordError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span>{recordError}</span>
                </div>
              )}

              <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Search & Select Student Dropdown */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Cari & Pilih Siswa *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={selectedStudentObj ? `${selectedStudentObj.nama} (NIS: ${selectedStudentObj.nis})` : "Ketik nama/NIS untuk mencari..."}
                      value={searchSiswaQuery}
                      onFocus={() => setIsSiswaDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchSiswaQuery(e.target.value);
                        setIsSiswaDropdownOpen(true);
                        if (selectedNis) {
                          setSelectedNis('');
                        }
                      }}
                      className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold transition-all text-xs text-slate-800"
                    />
                    {selectedNis && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNis('');
                          setSearchSiswaQuery('');
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isSiswaDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-50">
                      {filteredStudentsDropdown.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 italic text-[11px]">Siswa tidak ditemukan.</div>
                      ) : (
                        filteredStudentsDropdown.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedNis(s.nis);
                              setSearchSiswaQuery('');
                              setIsSiswaDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-[11px] transition-all"
                          >
                            <div>
                              <span className="font-bold text-slate-800 block">{s.nama}</span>
                              <span className="text-slate-400 font-mono text-[10px]">NIS: {s.nis} | Kelas: {s.kelas}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded font-bold text-[9px] uppercase font-mono">Pilih</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selection Card Indicator if student is active */}
                {selectedStudentObj && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <div>
                      <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wide block">Siswa Terpilih:</span>
                      <span className="font-extrabold text-slate-800 text-xs block">{selectedStudentObj.nama}</span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">NIS: {selectedStudentObj.nis} | Kelas: {selectedStudentObj.kelas} | Poin Saat Ini: <b className="text-indigo-600">{getStudentCurrentPoints(selectedStudentObj.nis)} Poin</b></span>
                    </div>
                    
                    {/* Download PDF button directly inside chosen indicator */}
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(selectedStudentObj, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] rounded-lg cursor-pointer transition-all shadow-sm shrink-0"
                      title="Unduh Rekap Pelanggaran PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Rekap PDF
                    </button>
                  </div>
                )}

                {/* Grid for Violation Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Jenis Pelanggaran *</label>
                    <select
                      required
                      value={selectedViolationName}
                      onChange={(e) => setSelectedViolationName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-xs text-slate-700 transition-all cursor-pointer font-bold"
                    >
                      <option value="">-- Pilih Pelanggaran --</option>
                      {violations.map(v => (
                        <option key={v.id} value={v.namaPelanggaran}>
                          {v.namaPelanggaran} ({v.poin} Poin)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Tanggal Kejadian *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="pl-9 pr-3 py-1.5 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* BK Staff input and Keterangan */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Nama Petugas BK / Guru Pencatat *</label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={petugas}
                        onChange={(e) => setPetugas(e.target.value)}
                        placeholder="Nama lengkap beserta gelar..."
                        className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-xs text-slate-700 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Keterangan Kasus / Kronologi</label>
                    <textarea
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Ketik detail rincian kronologi atau keterangan kejadian secara singkat..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-xs text-slate-700 transition-all font-semibold"
                    />
                  </div>

                  {/* Photo Proof uploading - Optional */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Upload Foto Bukti Pelanggaran (Opsional)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl cursor-pointer transition-colors text-xs shrink-0 font-extrabold">
                        <Image className="w-4 h-4 text-slate-500" /> Ambil / Pilih File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleRecordFileChange}
                          className="hidden"
                        />
                      </label>
                      {recordFoto ? (
                        <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden shrink-0">
                          <img src={recordFoto} alt="Preview Bukti" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setRecordFoto('')}
                            className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white p-0.5 rounded-full shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Format gambar jpeg/png (maks 1MB)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Form */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmittingRecord}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmittingRecord ? 'Menyimpan...' : 'Catat Kasus Pelanggaran'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* TAB 2: FORMULIR REMISI POIN (REDUKSI POIN SANKSI) */}
          {activeFormTab === 'remisi' && (
            <>
              {remisiSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in duration-350">
                  <Sparkles className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Pemberian Remisi Berhasil!</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Data remisi telah berhasil direkam dalam basis data kesiswaan. Total poin pelanggaran siswa bersangkutan langsung dipotong secara otomatis.
                    </p>
                  </div>
                </div>
              )}

              {remisiError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span>{remisiError}</span>
                </div>
              )}

              <form onSubmit={handleRemisiSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Search & Select Student Dropdown for Remission */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Cari & Pilih Penerima Remisi *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={selectedRemisiStudentObj ? `${selectedRemisiStudentObj.nama} (NIS: ${selectedRemisiStudentObj.nis})` : "Ketik nama/NIS siswa..."}
                      value={searchRemisiSiswaQuery}
                      onFocus={() => setIsRemisiSiswaDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchRemisiSiswaQuery(e.target.value);
                        setIsRemisiSiswaDropdownOpen(true);
                        if (remisiNis) {
                          setRemisiNis('');
                        }
                      }}
                      className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold transition-all text-xs text-slate-800"
                    />
                    {remisiNis && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemisiNis('');
                          setSearchRemisiSiswaQuery('');
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isRemisiSiswaDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-50">
                      {filteredRemisiStudentsDropdown.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 italic text-[11px]">Siswa tidak ditemukan.</div>
                      ) : (
                        filteredRemisiStudentsDropdown.map(s => {
                          const currentPts = getStudentCurrentPoints(s.nis);
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setRemisiNis(s.nis);
                                setSearchRemisiSiswaQuery('');
                                setIsRemisiSiswaDropdownOpen(false);
                              }}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-[11px] transition-all"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">{s.nama}</span>
                                <span className="text-slate-400 font-mono text-[10px]">NIS: {s.nis} | Kelas: {s.kelas}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold text-[9px] uppercase font-mono">Pilih ({currentPts} Pts)</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Live Automatic Point Reduction Summary */}
                {selectedRemisiStudentObj && (() => {
                  const currentPts = getStudentCurrentPoints(selectedRemisiStudentObj.nis);
                  const finalPts = Math.max(0, currentPts - remisiPoin);
                  const currentCategory = getCategoryFromPoints(currentPts);
                  const finalCategory = getCategoryFromPoints(finalPts);

                  return (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-3 animate-in slide-in-from-top-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wide block">Ringkasan Otomatis Remisi Poin:</span>
                          <span className="font-extrabold text-slate-800 text-xs block">{selectedRemisiStudentObj.nama}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">NIS: {selectedRemisiStudentObj.nis} | Kelas: {selectedRemisiStudentObj.kelas} | Wali: {selectedRemisiStudentObj.namaOrangTua}</span>
                        </div>
                        <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600 animate-bounce">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white p-2 rounded-xl border border-slate-200">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Poin Awal</span>
                          <span className="font-black text-slate-700 text-sm font-mono">{currentPts}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-rose-200 text-rose-600">
                          <span className="text-[9px] text-rose-400 block uppercase font-bold">Dipotong</span>
                          <span className="font-black text-rose-600 text-sm font-mono">-{remisiPoin}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-200 bg-emerald-50/20 text-emerald-600">
                          <span className="text-[9px] text-emerald-500 block uppercase font-bold">Poin Baru</span>
                          <span className="font-black text-emerald-600 text-sm font-mono">{finalPts}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col justify-between">
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Status Awal</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-center border mt-1 shrink-0 ${currentCategory.color}`}>
                            {currentCategory.label}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-emerald-100 flex flex-col justify-between">
                          <span className="text-[8px] text-emerald-500 block uppercase font-bold">Status Baru (Estimasi)</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-center border mt-1 shrink-0 ${finalCategory.color}`}>
                            {finalCategory.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Point amount and Date fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Jumlah Poin Remisi (Pengurangan) *</label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={remisiPoin}
                        onChange={(e) => setRemisiPoin(parseInt(e.target.value, 10) || 0)}
                        placeholder="Contoh: 10"
                        className="pl-9 pr-3 py-1.5 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-xs text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Tanggal Remisi *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={remisiTanggal}
                        onChange={(e) => setRemisiTanggal(e.target.value)}
                        className="pl-9 pr-3 py-1.5 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Authorized Officer & Description Reason */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Nama Wali Kelas / Petugas Pemberi Remisi *</label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={remisiPetugas}
                        onChange={(e) => setRemisiPetugas(e.target.value)}
                        placeholder="Nama lengkap guru pemberi remisi..."
                        className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs text-slate-700 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Alasan Pemberian Remisi / Kegiatan Positif *</label>
                    <textarea
                      required
                      value={remisiKeterangan}
                      onChange={(e) => setRemisiKeterangan(e.target.value)}
                      placeholder="Contoh: Mengikuti kegiatan sosial kerja bakti lingkungan sekolah / Berperilaku teladan dan rajin beribadah..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none text-xs text-slate-700 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Submit Remission */}
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmittingRemisi}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmittingRemisi ? 'Mengirim...' : 'Proses Remisi Poin'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Classroom Violation History Logs with Print Individual PDF Option */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Riwayat Kasus Pelanggaran Terbaru ({classNameFilter})
          </h3>
          <p className="text-[11px] text-slate-500">
            Berikut adalah seluruh riwayat kasus pelanggaran yang tercatat untuk siswa di kelas ini. Anda dapat mengunduh lembar keterangan formal individual kesiswaan.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">NIS</th>
                <th className="py-2.5 px-3">Siswa</th>
                <th className="py-2.5 px-3">Kasus Pelanggaran</th>
                <th className="py-2.5 px-3 text-center">Poin</th>
                <th className="py-2.5 px-3">Pencatat</th>
                <th className="py-2.5 px-3">Foto Bukti</th>
                <th className="py-2.5 px-3 text-center">Form Surat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
              {classRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center italic text-slate-400">
                    Belum ada riwayat kasus pelanggaran tercatat untuk kelas ini.
                  </td>
                </tr>
              ) : (
                classRecords.map(rec => {
                  const matchingStudent = classStudents.find(st => st.nis === rec.nis);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{rec.tanggal}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{rec.nis}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{rec.namaSiswa}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{rec.pelanggaran}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-rose-600">+{rec.poin}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">{rec.petugas}</td>
                      <td className="py-2.5 px-3">
                        {rec.foto ? (
                          <div className="relative group inline-block">
                            <img src={rec.foto} alt="Bukti" className="w-7 h-7 object-cover rounded border border-slate-200 hover:scale-[3.0] transition-transform duration-200 cursor-zoom-in relative z-10" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {matchingStudent ? (
                          <button
                            onClick={() => handleDownloadPDF(matchingStudent, true, rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors font-bold text-[10px]"
                            title="Unduh Surat Keterangan PDF"
                          >
                            <Download className="w-3.5 h-3.5" /> Surat PDF
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Siswa terhapus</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layanan & Konseling BK Terpadu Section */}
      <LayananBK 
        siswa={siswa}
        classNameFilter={classNameFilter}
        currentUser={currentUser}
      />

      {/* Student deletion confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <UserX className="w-6 h-6" />
              <h4 className="font-extrabold text-slate-900">Konfirmasi Hapus Siswa</h4>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed font-semibold">
              Apakah Anda yakin ingin menghapus siswa ini? Seluruh riwayat kasus pelanggaran, total akumulasi poin sanksi, dan riwayat pembinaan kesiswaan murid ini juga akan dihapus permanen dari basis data.
            </p>
            <div className="flex gap-3 text-xs font-bold">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleStudentDelete(confirmDeleteId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer transition-all"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal Dialog */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-blue-950 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm font-display tracking-tight text-white">{studentModalTitle}</h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleStudentFormSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              {studentFormError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span>{studentFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nomor Induk Siswa (NIS) *</label>
                <input
                  type="text"
                  required
                  disabled={!!studentFormState.id} // Disable NIS edit for safety
                  value={studentFormState.nis}
                  onChange={(e) => setStudentFormState(prev => ({ ...prev, nis: e.target.value }))}
                  placeholder="Contoh: 21009"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={studentFormState.nama}
                  onChange={(e) => setStudentFormState(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Ketik nama lengkap siswa..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Jenis Kelamin *</label>
                  <select
                    required
                    value={studentFormState.jk}
                    onChange={(e) => setStudentFormState(prev => ({ ...prev, jk: e.target.value as 'L' | 'P' }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none cursor-pointer font-bold transition-all text-xs text-slate-700"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Kelas *</label>
                  <input
                    type="text"
                    required
                    value={studentFormState.kelas}
                    onChange={(e) => setStudentFormState(prev => ({ ...prev, kelas: e.target.value }))}
                    placeholder="Format kelas, contoh: VII-A"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs text-slate-700 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nama Orang Tua / Wali *</label>
                <input
                  type="text"
                  required
                  value={studentFormState.namaOrangTua}
                  onChange={(e) => setStudentFormState(prev => ({ ...prev, namaOrangTua: e.target.value }))}
                  placeholder="Nama ibu atau bapak wali..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nomor HP Orang Tua *</label>
                <input
                  type="text"
                  required
                  value={studentFormState.noHp}
                  onChange={(e) => setStudentFormState(prev => ({ ...prev, noHp: e.target.value }))}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Upload Foto Profil (Opsional)</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors text-xs shrink-0 font-bold">
                    <Image className="w-4 h-4 text-slate-500" /> Pilih File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleStudentFileChange}
                      className="hidden"
                    />
                  </label>
                  {studentFormState.foto ? (
                    <div className="relative inline-block border border-slate-200 rounded-full overflow-hidden shrink-0">
                      <img src={studentFormState.foto} alt="Preview" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setStudentFormState(prev => ({ ...prev, foto: '' }))}
                        className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white p-0.5 rounded-full shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pilih file foto kesiswaan</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-md shadow-blue-100 transition-all"
                >
                  Simpan Data
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
