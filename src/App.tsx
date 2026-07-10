import React, { useState, useEffect } from 'react';
import { Siswa, Pelanggaran, Pencatatan, Pembinaan, User, Role } from './types';
import { googleSheetApi } from './services/googleSheetApi';
import DashboardOverview from './components/DashboardOverview';
import SiswaList from './components/SiswaList';
import PelanggaranList from './components/PelanggaranList';
import InputPelanggaranForm from './components/InputPelanggaranForm';
import RiwayatSiswaDetail from './components/RiwayatSiswaDetail';
import LaporanSiswa from './components/LaporanSiswa';
import PeringkatLeaderboard from './components/PeringkatLeaderboard';
import SetupPanduan from './components/SetupPanduan';
import RuangKelas, { belongsToSchool } from './components/RuangKelas';

// Helper to determine if a school/class tab is accessible by a user
function isTabAccessible(tabId: string, user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (user.role === 'Guru Piket') return true;
  
  const nama = user.nama;
  if (tabId === 'kelas-smp-nusantara-plus') {
    if (nama === 'Iien Puspitassari, S.Pd') return false;
    if (nama === 'Dedah Jubaedah, S.Pd.,MM') return false;
    if (nama === 'Shifa, S.Psi') return false;
    if (nama === 'Bukhari, S.Pd') return false;
  }
  if (tabId === 'kelas-sma-nusantara-plus') {
    if (nama === 'Iien Puspitassari, S.Pd') return false;
    if (nama === 'Dedah Jubaedah, S.Pd.,MM') return false;
    if (nama === 'Shifa, S.Psi') return false;
    if (nama === 'Nurma, S.Pd') return false;
  }
  if (tabId === 'kelas-smk-nusantara-1') {
    if (nama === 'Iien Puspitassari, S.Pd') return false;
    if (nama === 'Bukhari, S.Pd') return false;
    if (nama === 'Nurma, S.Pd') return false;
  }
  if (tabId === 'kelas-smk-2-kesehatan') {
    if (nama === 'Dedah Jubaedah, S.Pd.,MM') return false;
    if (nama === 'Shifa, S.Psi') return false;
    if (nama === 'Bukhari, S.Pd') return false;
    if (nama === 'Nurma, S.Pd') return false;
  }
  return true;
}

// Helper to check if student is accessible by user
function isStudentAccessible(studentKelas: string, user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (user.role === 'Guru Piket') return true;
  
  const schools = [
    { id: 'kelas-smp-nusantara-plus', name: 'SMP NUSANTARA PLUS' },
    { id: 'kelas-sma-nusantara-plus', name: 'SMA NUSANTARA PLUS' },
    { id: 'kelas-smk-nusantara-1', name: 'SMK NUSANTARA 1' },
    { id: 'kelas-smk-2-kesehatan', name: 'SMK 2 KESEHATAN' }
  ];
  
  for (const school of schools) {
    if (belongsToSchool(studentKelas, school.name)) {
      return isTabAccessible(school.id, user);
    }
  }
  
  return true;
}
import { 
  LayoutDashboard, 
  Users, 
  Scale, 
  PlusCircle, 
  UserSearch, 
  FileSpreadsheet, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  GraduationCap, 
  UserCheck, 
  KeyRound, 
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Application Data States
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [violations, setViolations] = useState<Pelanggaran[]>([]);
  const [pencatatan, setPencatatan] = useState<Pencatatan[]>([]);
  const [pembinaan, setPembinaan] = useState<Pembinaan[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Navigation states
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedNisFromOutside, setSelectedNisFromOutside] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRuangKelasOpen, setIsRuangKelasOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check login session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user_session');
    const storedToken = localStorage.getItem('auth_token');
    if (storedUser && storedToken) {
      try {
        const userObj = JSON.parse(storedUser) as User;
        if (userObj && userObj.username === 'gurubk' && userObj.nama !== 'Sulaiman, S.Psi.') {
          userObj.nama = 'Sulaiman, S.Psi.';
          localStorage.setItem('user_session', JSON.stringify(userObj));
        } else if (userObj && userObj.username === 'admin' && userObj.nama !== 'Iien Puspitasari, S.Pd') {
          userObj.nama = 'Iien Puspitasari, S.Pd';
          localStorage.setItem('user_session', JSON.stringify(userObj));
        } else if (userObj && (userObj.username === 'walikelas' || userObj.username === 'gurupiket') && userObj.nama !== 'No Name') {
          userObj.nama = 'No Name';
          userObj.role = 'Guru Piket';
          localStorage.setItem('user_session', JSON.stringify(userObj));
        }
        setCurrentUser(userObj);
      } catch (e) {
        // Ignore JSON parsing issues
      }
      setToken(storedToken);
    }
  }, []);

  // Fetch data from server once authenticated
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Keep Ruang Kelas accordion open if a classroom tab is active
  useEffect(() => {
    if (activeTab.startsWith('kelas-')) {
      setIsRuangKelasOpen(true);
    }
  }, [activeTab]);

  // Load all students, master violations, and logging records
  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      const [resSiswa, resViolations, resRecords] = await Promise.all([
        googleSheetApi.getStudents(),
        googleSheetApi.getViolations(),
        googleSheetApi.getRecords()
      ]);

      if (resSiswa.success && resSiswa.data) setSiswa(resSiswa.data);
      if (resViolations.success && resViolations.data) setViolations(resViolations.data);
      
      if (resRecords.success && resRecords.data) {
        setPencatatan(resRecords.data.pencatatan);
        setPembinaan(resRecords.data.pembinaan);
      }
    } catch (err) {
      showToast('Gagal memuat data dari database kesiswaan.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Helper to trigger toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Harap isi semua kolom login.');
      return;
    }

    setIsLoggingIn(true);
    const response = await googleSheetApi.login(loginUsername, loginPassword);
    setIsLoggingIn(false);

    if (response.success && response.token && response.user) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_session', JSON.stringify(response.user));
      setToken(response.token);
      setCurrentUser(response.user);
      showToast(`Selamat datang kembali, ${response.user.nama}!`, 'success');
    } else {
      setLoginError(response.message || 'Username atau password salah.');
    }
  };

  // Quick Login trigger for demo
  const handleQuickLogin = (uname: string, pass: string) => {
    setLoginUsername(uname);
    setLoginPassword(pass);
    setLoginError('');
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_session');
    setToken(null);
    setCurrentUser(null);
    setSiswa([]);
    setViolations([]);
    setPencatatan([]);
    setPembinaan([]);
    setActiveTab('dashboard');
    showToast('Berhasil logout dari sistem kesiswaan.', 'success');
  };

  // ------------------ DATA OPERATIONS INTERACTION ------------------

  // 1. Students (Siswa) CRUD
  const handleAddStudent = async (studentData: Omit<Siswa, 'id'> & { id?: string }): Promise<boolean> => {
    const res = await googleSheetApi.addStudent(studentData);
    if (res.success && res.data) {
      setSiswa(res.data);
      showToast('Data siswa berhasil disimpan.', 'success');
      return true;
    } else {
      showToast(res.message || 'Gagal menyimpan siswa.', 'error');
      return false;
    }
  };

  const handleDeleteStudent = async (id: string): Promise<boolean> => {
    const res = await googleSheetApi.deleteStudent(id);
    if (res.success && res.data) {
      setSiswa(res.data);
      // Clean up local list
      showToast('Siswa beserta seluruh riwayatnya berhasil dihapus.', 'success');
      // Refresh logs
      loadAllData();
      return true;
    } else {
      showToast(res.message || 'Gagal menghapus siswa.', 'error');
      return false;
    }
  };

  // 2. Violation Master CRUD
  const handleAddViolation = async (violationData: Omit<Pelanggaran, 'id'> & { id?: string }): Promise<boolean> => {
    const res = await googleSheetApi.addViolation(violationData);
    if (res.success && res.data) {
      setViolations(res.data);
      showToast('Aturan sanksi kesiswaan berhasil disimpan.', 'success');
      return true;
    } else {
      showToast(res.message || 'Gagal menyimpan jenis pelanggaran.', 'error');
      return false;
    }
  };

  const handleDeleteViolation = async (id: string): Promise<boolean> => {
    const res = await googleSheetApi.deleteViolation(id);
    if (res.success && res.data) {
      setViolations(res.data);
      showToast('Sanksi berhasil dihapus dari daftar master.', 'success');
      return true;
    } else {
      showToast(res.message || 'Gagal menghapus pelanggaran.', 'error');
      return false;
    }
  };

  // 3. Log Records mutations (addRecord / deleteRecord)
  const handleAddRecord = async (recordData: {
    nis: string;
    pelanggaran: string;
    tanggal: string;
    petugas: string;
    keterangan: string;
    foto?: string;
    poin?: number;
  }): Promise<boolean> => {
    const res = await googleSheetApi.addRecord(recordData);
    if (res.success && res.data) {
      // Refresh all datasets because points recalculation takes place
      await loadAllData();
      showToast('Pencatatan pelanggaran baru berhasil direkam.', 'success');
      return true;
    } else {
      showToast(res.message || 'Gagal menyimpan pencatatan.', 'error');
      return false;
    }
  };

  const handleDeleteRecord = async (id: string): Promise<boolean> => {
    const res = await googleSheetApi.deleteRecord(id);
    if (res.success && res.data) {
      await loadAllData();
      showToast('Catatan pelanggaran telah berhasil dibatalkan/dihapus.', 'success');
      return true;
    } else {
      showToast(res.message || 'Gagal membatalkan catatan pelanggaran.', 'error');
      return false;
    }
  };

  // Handle linking to Student Profile from other widgets
  const handleSelectSiswa = (nis: string) => {
    setSelectedNisFromOutside(nis);
    setActiveTab('riwayat');
  };

  // ------------------ RENDER TAB CONTEXT ------------------

  // Check roles permissions
  const renderTabContent = () => {
    if (!currentUser) return null;

    const userRole = currentUser.role;

    // Filter student data and records based on active BK teacher restrictions
    const filteredSiswa = siswa.filter(s => isStudentAccessible(s.kelas, currentUser));
    const filteredPencatatan = pencatatan.filter(r => isStudentAccessible(r.kelas, currentUser));
    const filteredPembinaan = pembinaan.filter(p => {
      const s = siswa.find(st => st.nis === p.nis);
      return s ? isStudentAccessible(s.kelas, currentUser) : true;
    });

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            siswa={filteredSiswa}
            pelanggaran={violations}
            pencatatan={filteredPencatatan}
            pembinaan={filteredPembinaan}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectSiswa={handleSelectSiswa}
          />
        );
      
      case 'siswa':
        if (userRole !== 'Admin' && userRole !== 'Guru BK') {
          return <AccessDenied />;
        }
        return (
          <SiswaList
            siswa={filteredSiswa}
            pencatatan={filteredPencatatan}
            userRole={userRole}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        );

      case 'pelanggaran':
        return (
          <PelanggaranList
            violations={violations}
            userRole={userRole}
            onAddViolation={handleAddViolation}
            onDeleteViolation={handleDeleteViolation}
          />
        );

      case 'input':
        if (userRole !== 'Admin' && userRole !== 'Guru BK') {
          return <AccessDenied />;
        }
        return (
          <InputPelanggaranForm
            siswa={filteredSiswa}
            violations={violations}
            currentUser={currentUser}
            onAddRecord={handleAddRecord}
          />
        );

      case 'riwayat':
        return (
          <RiwayatSiswaDetail
            siswa={filteredSiswa}
            pencatatan={filteredPencatatan}
            pembinaan={filteredPembinaan}
            userRole={userRole}
            onDeleteRecord={handleDeleteRecord}
            selectedNisFromOutside={selectedNisFromOutside}
          />
        );

      case 'laporan':
        // Guru Piket can only see their class's data if configured, otherwise see all
        let displaySiswa = filteredSiswa;
        let displayPencatatan = filteredPencatatan;
        
        if (userRole === 'Guru Piket' && currentUser.kelasAjar) {
          displaySiswa = filteredSiswa.filter(s => s.kelas === currentUser.kelasAjar);
          displayPencatatan = filteredPencatatan.filter(r => r.kelas === currentUser.kelasAjar);
        }

        return (
          <LaporanSiswa
            pencatatan={displayPencatatan}
            siswa={displaySiswa}
          />
        );

      case 'peringkat':
        return (
          <PeringkatLeaderboard
            siswa={filteredSiswa}
            pencatatan={filteredPencatatan}
            violations={violations}
            onSelectSiswa={handleSelectSiswa}
          />
        );

      case 'setup':
        if (userRole !== 'Admin') {
          return <AccessDenied />;
        }
        return <SetupPanduan />;

      case 'kelas-smp-nusantara-plus':
        if (!isTabAccessible('kelas-smp-nusantara-plus', currentUser)) {
          return <AccessDenied />;
        }
        return (
          <RuangKelas
            siswa={filteredSiswa}
            violations={violations}
            pencatatan={filteredPencatatan}
            currentUser={currentUser}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddRecord={handleAddRecord}
            classNameFilter="SMP NUSANTARA PLUS"
          />
        );

      case 'kelas-sma-nusantara-plus':
        if (!isTabAccessible('kelas-sma-nusantara-plus', currentUser)) {
          return <AccessDenied />;
        }
        return (
          <RuangKelas
            siswa={filteredSiswa}
            violations={violations}
            pencatatan={filteredPencatatan}
            currentUser={currentUser}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddRecord={handleAddRecord}
            classNameFilter="SMA NUSANTARA PLUS"
          />
        );

      case 'kelas-smk-nusantara-1':
        if (!isTabAccessible('kelas-smk-nusantara-1', currentUser)) {
          return <AccessDenied />;
        }
        return (
          <RuangKelas
            siswa={filteredSiswa}
            violations={violations}
            pencatatan={filteredPencatatan}
            currentUser={currentUser}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddRecord={handleAddRecord}
            classNameFilter="SMK NUSANTARA 1"
          />
        );

      case 'kelas-smk-2-kesehatan':
        if (!isTabAccessible('kelas-smk-2-kesehatan', currentUser)) {
          return <AccessDenied />;
        }
        return (
          <RuangKelas
            siswa={filteredSiswa}
            violations={violations}
            pencatatan={filteredPencatatan}
            currentUser={currentUser}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddRecord={handleAddRecord}
            classNameFilter="SMK 2 KESEHATAN"
          />
        );

      default:
        return <div className="text-center py-10 font-bold">Modul Belum Diimplementasikan</div>;
    }
  };

  // Access Denied Widget
  const AccessDenied = () => (
    <div className="bg-white p-12 rounded-2xl border border-red-100 text-center space-y-4 max-w-xl mx-auto shadow-xs">
      <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
      <h3 className="font-extrabold text-slate-900 text-lg">Akses Ditolak</h3>
      <p className="text-slate-500 text-xs leading-relaxed">
        Maaf, akun Anda ({currentUser?.nama} - {currentUser?.role}) tidak memiliki hak akses yang memadai untuk membuka modul administratif ini. Silakan hubungi Admin Sekolah jika ini adalah kekeliruan.
      </p>
    </div>
  );

  // ------------------ LOGIN PANEL SCREEN ------------------

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        
        {/* Institutional School Logo & Name Banner */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-blue-600/15 border border-blue-500/30 text-blue-500 shadow-xl shadow-blue-500/5">
            <GraduationCap className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight font-display">PORTAL BIMBINGAN & KONSELING</h1>
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wide">SMP, SMA, SMK 1 & 2 YAYASAN ALDIANA NUSANTARA</h2>
            <p className="text-[11px] text-slate-400 font-medium">Pusat Pelayanan Bimbingan & Konseling Berbasis Digital</p>
          </div>
        </div>

        {/* Login box */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-350">
          <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
            
            <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
              <KeyRound className="w-4.5 h-4.5 text-blue-500" />
              <span className="text-sm font-bold text-slate-200">Masuk Aplikasi</span>
            </div>

            {loginError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 text-xs">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Username</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Ketik username Anda..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-600 rounded-xl outline-none text-sm text-slate-200 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Ketik password sandi..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-600 rounded-xl outline-none text-sm text-slate-200 transition-all"
                />
              </div>

              <button
                id="btn-login"
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-900/40 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoggingIn ? 'Memvalidasi...' : 'Masuk Dashboard'}
              </button>
            </form>

            {/* Quick Login Templates for Demo and Grading */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Pilih Akun Penguji Cepat:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="py-2 px-1 text-center bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg cursor-pointer border border-slate-800 transition-colors"
                >
                  Admin
                </button>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const [uname, pass] = e.target.value.split(':');
                        handleQuickLogin(uname, pass);
                        e.target.value = "";
                      }
                    }}
                    className="w-full h-full text-center bg-slate-800 hover:bg-slate-700 text-amber-400 py-2 px-1 rounded-lg cursor-pointer border border-slate-800 transition-colors font-bold outline-none text-[10px] appearance-none"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-slate-400">Guru BK ▾</option>
                    <option value="iien:iien123" className="text-slate-300 bg-slate-950 text-left font-bold text-xs">1. Iien (SMK 2)</option>
                    <option value="dedah:dedah123" className="text-slate-300 bg-slate-950 text-left font-bold text-xs">2. Dedah (SMK 1)</option>
                    <option value="shifa:shifa123" className="text-slate-300 bg-slate-950 text-left font-bold text-xs">3. Shifa (SMK 1)</option>
                    <option value="bukhari:erik123" className="text-slate-300 bg-slate-950 text-left font-bold text-xs">4. Bukhari (SMA)</option>
                    <option value="nurma:nurma123" className="text-slate-300 bg-slate-950 text-left font-bold text-xs">5. Nurma (SMP)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ------------------ MAIN WORKSPACE DASHBOARD ------------------

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard, roles: ['Admin', 'Guru BK', 'Guru Piket'] },
    { id: 'siswa', label: 'Manajemen Siswa', icon: Users, roles: ['Admin', 'Guru BK'] },
    { id: 'pelanggaran', label: 'Master Pelanggaran', icon: Scale, roles: ['Admin', 'Guru BK', 'Guru Piket'] },
    { id: 'input', label: 'Input Pelanggaran', icon: PlusCircle, roles: ['Admin', 'Guru BK'] },
    { id: 'riwayat', label: 'Riwayat Siswa', icon: UserSearch, roles: ['Admin', 'Guru BK', 'Guru Piket'] },
    { id: 'laporan', label: 'Laporan Rekap', icon: FileSpreadsheet, roles: ['Admin', 'Guru BK', 'Guru Piket'] },
    { id: 'peringkat', label: 'Peringkat & Graf', icon: Trophy, roles: ['Admin', 'Guru BK', 'Guru Piket'] },
    { id: 'setup', label: 'Koneksi Sheets', icon: Settings, roles: ['Admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Toast message popup */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl border bg-white shadow-2xl flex items-start gap-3 w-80 animate-in fade-in slide-in-from-top-5 duration-350">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5.5 h-5.5 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 block">Sistem Bimbingan & Konseling</span>
            <p className="text-xs text-slate-600 leading-normal">{toast.message}</p>
          </div>
        </div>
      )}

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden bg-blue-950 border-b border-blue-900 text-white py-3.5 px-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5.5 h-5.5 text-blue-500 shrink-0" />
          <div>
            <span className="font-extrabold tracking-tight text-[10px] font-display block leading-none uppercase">PORTAL GURU BK DIGITAL</span>
            <span className="text-[8px] text-blue-300 font-extrabold block uppercase tracking-wider mt-0.5">YAYASAN ALDIANA NUSANTARA</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border border-rose-500/25"
          >
            <LogOut className="w-3 h-3" /> Keluar
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 hover:bg-blue-900 rounded-lg cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </div>
      </div>

      {/* SIDEBAR NAVIGATION (Desktop persistent, Mobile collapsible drawer) */}
      <aside className={`w-full md:w-60 bg-blue-950 text-slate-300 flex flex-col justify-between shrink-0 no-print border-r border-blue-900 transition-all duration-300 md:block ${
        isMobileMenuOpen ? 'block' : 'hidden'
      }`}>
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="p-6 border-b border-blue-900 hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <span className="font-black text-white text-[11px] tracking-tight font-display block leading-tight">YAYASAN ALDIANA NUSANTARA</span>
              <span className="text-[8px] text-blue-300 font-bold uppercase tracking-wider block leading-none">Pusat Layanan BK Digital</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="py-4 px-3 space-y-1">
            {filteredMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  id={`tab-nav-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                    if (item.id === 'riwayat') setSelectedNisFromOutside(''); // Clear search override on direct click
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-500/10 text-blue-400' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}

            {/* RUANG KELAS DROPDOWN ACCORDION */}
            <div className="space-y-1 pt-1 border-t border-blue-900/40">
              <button
                type="button"
                onClick={() => setIsRuangKelasOpen(!isRuangKelasOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab.startsWith('kelas-') 
                    ? 'bg-blue-500/10 text-blue-400 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4.5 h-4.5" />
                  <span>RUANG KELAS</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isRuangKelasOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isRuangKelasOpen && (
                <div className="pl-6 space-y-1 pt-0.5 animate-in slide-in-from-top-1 duration-150">
                  {[
                    { id: 'kelas-smp-nusantara-plus', label: 'SMP NUSANTARA PLUS' },
                    { id: 'kelas-sma-nusantara-plus', label: 'SMA NUSANTARA PLUS' },
                    { id: 'kelas-smk-nusantara-1', label: 'SMK NUSANTARA 1' },
                    { id: 'kelas-smk-2-kesehatan', label: 'SMK 2 KESEHATAN' }
                  ].filter(classroom => isTabAccessible(classroom.id, currentUser)).map(classroom => {
                    const isSubActive = activeTab === classroom.id;
                    return (
                      <button
                        key={classroom.id}
                        id={`tab-nav-${classroom.id}`}
                        onClick={() => {
                          setActiveTab(classroom.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSubActive 
                            ? 'bg-blue-500/20 text-blue-400 font-extrabold' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-semibold'
                        }`}
                      >
                        {classroom.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User context footer card */}
        <div className="p-4 border-t border-blue-900 bg-blue-950/60">
          <div className="p-4 bg-blue-900/40 rounded-xl border border-blue-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white/20 overflow-hidden flex items-center justify-center font-bold text-white">
                {currentUser.nama.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="text-xs font-bold text-white truncate block leading-tight">{currentUser.nama}</span>
                <span className="text-[10px] text-blue-300 font-semibold block uppercase tracking-wider">
                  {currentUser.role} {currentUser.kelasAjar ? `(${currentUser.kelasAjar})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* DESKTOP TOP HEADER */}
        <header className="hidden md:flex bg-white border-b border-slate-200/85 px-8 py-4 items-center justify-between no-print shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">Portal Layanan BK</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {currentUser.role}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{currentUser.nama}</span>
              <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider">
                {currentUser.role} {currentUser.kelasAjar ? `(${currentUser.kelasAjar})` : ''}
              </span>
            </div>
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-rose-100 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar Sistem
            </button>
          </div>
        </header>

        {/* MAIN WORKSPACE VIEWPORT */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Loader status indicator overlay */}
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-slate-500 font-mono text-xs">Menyinkronkan Basis Data...</span>
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>
    </div>
  );
}
