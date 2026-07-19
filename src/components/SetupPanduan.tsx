import React, { useState, useEffect } from 'react';
import { googleSheetApi } from '../services/googleSheetApi';
import { Database, Copy, Check, FileText, CheckCircle2, AlertTriangle, Link, ArrowRight, RefreshCw, Download, Upload } from 'lucide-react';

export default function SetupPanduan() {
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state variables
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');
  const [syncError, setSyncError] = useState('');

  const [fullGsCode, setFullGsCode] = useState('');

  // Fetch current database configuration on load and load actual Code.gs
  useEffect(() => {
    const fetchConfigAndCode = async () => {
      const res = await googleSheetApi.getConfig();
      if (res.success && res.data) {
        setGoogleScriptUrl(res.data.googleScriptUrl || '');
        setIsConnected(res.data.isGoogleScriptConnected);
      }
      
      try {
        const codeRes = await googleSheetApi.getCodeGs();
        if (codeRes.success && codeRes.data) {
          setFullGsCode(codeRes.data.code);
        }
      } catch (err) {
        console.warn('Gagal memuat Code.gs:', err);
      }
    };
    fetchConfigAndCode();
  }, []);

  const handleCopyCode = () => {
    // If we loaded the real Code.gs, copy that. Otherwise, instruct the user.
    const codeToCopy = fullGsCode || `/**
 * Google Apps Script - Sistem Pencatatan Pelanggaran Siswa
 * 
 * Silakan buka berkas Code.gs yang berada di direktori utama (root) proyek ini
 * untuk menyalin keseluruhan kode integrasi Google Sheets yang terbaru dan lengkap.
 */`;
    
    navigator.clipboard.writeText(codeToCopy);
    setCopiedIndex(true);
    setTimeout(() => setCopiedIndex(false), 3000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaved(false);

    if (googleScriptUrl.trim() !== '' && !googleScriptUrl.startsWith('https://script.google.com/')) {
      setErrorMsg('Format URL tidak valid. URL Apps Script harus diawali dengan https://script.google.com/');
      setIsLoading(false);
      return;
    }

    const res = await googleSheetApi.saveConfig(googleScriptUrl);
    setIsLoading(false);

    if (res.success) {
      setIsSaved(true);
      setSuccessMsg(res.message || 'Konfigurasi API berhasil diperbarui di server kesiswaan.');
      setIsConnected(!!googleScriptUrl);
      setTimeout(() => {
        setIsSaved(false);
        window.location.reload(); // Refresh the app to load the new data pulled from Google Sheets
      }, 3000);
    } else {
      setErrorMsg(res.message || 'Gagal menyimpan konfigurasi.');
    }
  };

  const handleSyncPull = async () => {
    if (!window.confirm('PERINGATAN: Menarik data dari Google Sheet akan menimpa seluruh data lokal yang ada di aplikasi Anda saat ini. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }
    setSyncLoading(true);
    setSyncSuccess('');
    setSyncError('');
    try {
      const res = await googleSheetApi.syncPull();
      if (res.success) {
        setSyncSuccess('Tarik data berhasil! Semua data di aplikasi telah diperbarui dengan data terbaru dari Google Sheet.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSyncError(res.message || 'Gagal menarik data dari Google Sheet. Pastikan URL Apps Script sudah benar.');
      }
    } catch (err: any) {
      setSyncError('Gagal menarik data: ' + err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncPush = async () => {
    if (!window.confirm('PERINGATAN: Mengirim data lokal akan menimpa isi spreadsheet Google Sheet Anda saat ini dengan data dari aplikasi. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }
    setSyncLoading(true);
    setSyncSuccess('');
    setSyncError('');
    try {
      const res = await googleSheetApi.syncPush();
      if (res.success) {
        setSyncSuccess('Kirim data berhasil! Semua data lokal aplikasi berhasil diunggah dan menimpa Google Sheet Anda.');
      } else {
        setSyncError(res.message || 'Gagal mengirim data ke Google Sheet. Pastikan Anda sudah memperbarui Google Apps Script Anda ke versi terbaru dari tab panduan.');
      }
    } catch (err: any) {
      setSyncError('Gagal mengirim data: ' + err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncMerge = async () => {
    setSyncLoading(true);
    setSyncSuccess('');
    setSyncError('');
    try {
      const res = await googleSheetApi.syncMerge();
      if (res.success) {
        setSyncSuccess('Sinkronisasi dua arah berhasil! Semua data di aplikasi dan Google Sheet sekarang telah digabungkan dan sinkron 100%.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSyncError(res.message || 'Gagal melakukan sinkronisasi dua arah. Pastikan Anda sudah memperbarui Google Apps Script Anda ke versi terbaru dari tab panduan.');
      }
    } catch (err: any) {
      setSyncError('Gagal melakukan sinkronisasi dua arah: ' + err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const renderTroubleshooting = (errorText: string) => {
    if (!errorText) return null;

    const isBlocked = errorText.includes('<!DOCTYPE') || 
                      errorText.includes('html') || 
                      errorText.includes('Failed to parse Google Apps Script response') ||
                      errorText.includes('window[\'ppConfig\']') ||
                      errorText.includes('deleteIsEnforced') ||
                      errorText.includes('sealIsEnforced');

    const isActionNotRecognized = errorText.includes('Action tidak dikenali') || 
                                  errorText.includes('format POST salah') || 
                                  errorText.includes('tidak disupport lewat POST');

    return (
      <div className="space-y-3 mt-3.5">
        {isBlocked && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-slate-800 text-xs rounded-xl space-y-3 leading-relaxed animate-in fade-in duration-200 shadow-xs">
            <div className="pb-1.5 border-b border-amber-200">
              <p className="font-bold text-amber-900 flex items-center gap-1.5 text-[13px]">
                ⚠️ Otorisasi Google Diblokir (PENTING)
              </p>
              <p className="text-[11px] text-amber-800 mt-1">
                Aplikasi menerima halaman HTML (Google Login/Block Screen) bukan data JSON. Hal ini terjadi karena <strong>Google memblokir akses skrip Anda</strong> karena masalah otorisasi atau batasan keamanan akun.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                  Solusi 1: Selesaikan Otorisasi Akses di Google Sheets (Wajib)
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Anda mungkin belum memberikan izin "Allow" secara lengkap ke skrip Anda. Ikuti cara ini:
                </p>
                <ol className="list-decimal pl-4.5 mt-1 text-[11px] text-slate-700 space-y-1">
                  <li>Buka spreadsheet Google Sheets Anda.</li>
                  <li>Klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Di kanan atas editor Apps Script, klik tombol <strong>Terapkan (Deploy) &gt; Kelola Penerapan (Manage Deployments)</strong>.</li>
                  <li>Klik ikon <strong>pensil (edit)</strong> di penerapan aktif Anda.</li>
                  <li>Pada bagian Versi (Version), pilih <strong>"Versi baru" (New Version)</strong>. <em>(Ini wajib agar skrip terupdate)</em>.</li>
                  <li>Pastikan "Siapa yang memiliki akses" diatur ke <strong>"Siapa saja" (Anyone)</strong>.</li>
                  <li>Klik tombol <strong>Terapkan (Deploy)</strong>.</li>
                  <li>Jika muncul jendela <strong>"Otorisasi Akses" (Authorize Access)</strong>, klik <strong>Tinjau Izin (Review Permissions)</strong> &gt; Pilih Akun Google Anda &gt; Klik <strong>Lanjutan (Advanced)</strong> di kiri bawah &gt; Klik <strong>Buka Project tak berjudul (tidak aman)</strong> &gt; Scroll ke bawah lalu klik <strong>Izinkan (Allow)</strong>.</li>
                  <li>Salin ulang URL Aplikasi Web baru Anda dan hubungkan kembali.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-amber-200/60">
                <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  🔑 Solusi 2 (Sangat Direkomendasikan untuk akun belajar.id): Gunakan Gmail Pribadi
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                  Akun dinas/sekolah seperti <strong>@guru.smp.belajar.id</strong> atau <strong>@admin.smp.belajar.id</strong> memiliki kebijakan keamanan ketat yang dikunci oleh admin IT. Opsi berbagi dengan "Siapa Saja (Anyone)" sering kali diblokir secara otomatis oleh Google Workspace di bawah kap.
                </p>
                <p className="text-[11px] text-amber-900 font-semibold mt-1">
                  Cara paling praktis dan dijamin 100% sukses:
                </p>
                <ul className="list-disc pl-4.5 text-[11px] text-slate-700 space-y-1 mt-0.5">
                  <li>Buat Google Spreadsheet baru menggunakan akun <strong>Gmail pribadi Anda (@gmail.com)</strong>.</li>
                  <li>Salin kode skrip integrasi dan terapkan sebagai Aplikasi Web dengan akses <strong>"Siapa Saja" (Anyone)</strong> lewat akun pribadi tersebut.</li>
                  <li>Akun pribadi dijamin bebas dari batasan Workspace sekolah dan sinkronisasi akan langsung berjalan lancar selamanya!</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {isActionNotRecognized && (
          <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-950 text-xs rounded-xl space-y-2 leading-normal animate-in fade-in duration-200">
            <p className="font-bold text-amber-800 flex items-center gap-1">
              💡 Cara Mengatasi: Update Penerapan Apps Script Anda
            </p>
            <p className="text-[11px] text-amber-700">
              Error ini terjadi karena Google Apps Script Anda masih menjalankan <strong>versi lama</strong> yang belum mendukung sinkronisasi gabungan baru (<em>overwriteAllData</em>). Silakan ikuti langkah berikut agar sinkron secara permanen:
            </p>
            <ol className="list-decimal pl-4 text-[11px] text-amber-850 space-y-1">
              <li>Gunakan tombol <strong>"Salin Contoh Kode Integrasi"</strong> di panel sebelah kiri untuk menyalin kode integrasi terbaru.</li>
              <li>Buka editor Google Apps Script spreadsheet Anda, hapus seluruh kode lama, lalu tempel (paste) kode baru tersebut. Simpan proyek Anda.</li>
              <li><strong>PENTING:</strong> Di kanan atas editor Apps Script, klik tombol biru <strong>Terapkan (Deploy) &gt; Kelola Penerapan (Manage Deployments)</strong>.</li>
              <li>Klik ikon <strong>pensil (edit)</strong> di penerapan aktif Anda.</li>
              <li>Pada bagian Versi (Version), ganti dari "Versi aktif" menjadi <strong>"Versi baru" (New Version)</strong>. Jika tidak memilih Versi Baru, Google akan tetap menjalankan kode lama Anda!</li>
              <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> untuk menyimpan pembaruan.</li>
              <li>Kembali ke aplikasi ini dan lakukan sinkronisasi ulang!</li>
            </ol>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Step-by-Step Guide Panel - 2 Cols */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6 font-sans">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-display">Panduan Koneksi Google Sheets</h2>
          <p className="text-xs text-slate-500 font-sans">Gunakan Google Sheets gratis sebagai database andal dan real-time untuk sekolah Anda</p>
        </div>

        {/* Step List */}
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">1</div>
            <div className="space-y-1.5 pt-0.5">
              <span className="font-bold text-slate-900 block">Siapkan Google Spreadsheet Baru</span>
              <p className="text-xs text-slate-500">
                Masuk ke <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">sheets.new</a> dengan akun Google sekolah Anda. Beri nama spreadsheet, misalnya: <strong className="text-slate-800">"DB_Pelanggaran_Siswa"</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">2</div>
            <div className="space-y-2 pt-0.5">
              <span className="font-bold text-slate-900 block">Buka Google Apps Script</span>
              <p className="text-xs text-slate-500">
                Di menu atas spreadsheet, klik menu <strong className="text-slate-800">Ekstensi (Extensions) &gt; Apps Script</strong>. Jendela editor skrip baru akan terbuka.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">3</div>
            <div className="space-y-3.5 pt-0.5 w-full">
              <span className="font-bold text-slate-900 block">Salin Kode Code.gs</span>
              <p className="text-xs text-slate-500">
                Buka file <strong className="text-slate-800">Code.gs</strong> yang ada di root direktori folder aplikasi ini, salin seluruh kodenya, dan paste ke editor skrip Google Apps Script (hapus kode bawaan yang ada terlebih dahulu).
              </p>
              
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedIndex ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" /> Tersalin ke Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Salin Contoh Kode Integrasi
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">4</div>
            <div className="space-y-2 pt-0.5">
              <span className="font-bold text-slate-900 block">Terapkan Sebagai Aplikasi Web (Deploy)</span>
              <p className="text-xs text-slate-500">
                Di bagian kanan atas Apps Script, klik tombol biru <strong className="text-slate-800">Terapkan (Deploy) &gt; Penerapan Baru (New Deployment)</strong>.
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
                <li>Klik ikon gerigi (Jenis Penerapan) &gt; pilih <strong className="text-slate-800">Aplikasi Web</strong>.</li>
                <li>Jalankan Sebagai: <strong className="text-slate-800">Saya (email Anda)</strong>.</li>
                <li>Siapa yang memiliki akses: <strong className="text-slate-800">Siapa saja (Anyone)</strong>. Ini wajib agar API bisa terhubung.</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">5</div>
            <div className="space-y-1.5 pt-0.5">
              <span className="font-bold text-slate-900 block">Salin Web App URL</span>
              <p className="text-xs text-slate-500">
                Klik tombol <strong className="text-slate-800">Terapkan</strong>, berikan izin akses akun Google jika diminta, dan salin <strong className="text-blue-600">URL Aplikasi Web</strong> yang dihasilkan.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center shrink-0 border border-blue-100 font-mono">6</div>
            <div className="space-y-1.5 pt-0.5">
              <span className="font-bold text-slate-900 block">Hubungkan di Sini</span>
              <p className="text-xs text-slate-500">
                Tempel URL Aplikasi Web tersebut ke formulir di samping kanan, klik "Hubungkan Database", dan spreadsheet Google Sheets Anda sudah aktif serta tersinkronisasi 100%!
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Right Connection Form Panel */}
      <div className="space-y-6 font-sans">
        {/* Connection status widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-950 text-sm">Status Sinkronisasi</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {isConnected ? 'SINKRON GOOGLE SHEETS ACTIVE' : 'DATABASE OFFLINE LOKAL (FALLBACK)'}
              </span>
            </div>
          </div>

          {isSaved && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="break-words select-all">{errorMsg}</span>
              </div>
              {renderTroubleshooting(errorMsg)}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Web App URL Google Script</label>
              <textarea
                rows={3}
                required
                value={googleScriptUrl}
                onChange={(e) => setGoogleScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-mono"
              />
              <span className="text-[10px] text-slate-400 block leading-normal">
                Kosongkan URL dan klik Simpan untuk beralih kembali menggunakan database offline JSON internal yang aman dan cepat.
              </span>
            </div>

            <button
              id="btn-save-script-url"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? 'Sedang Menghubungkan...' : 'Hubungkan Database Google Sheet'}
            </button>
          </form>
        </div>

        {/* Data Synchronization Widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <RefreshCw className={`w-5 h-5 ${syncLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-950 text-sm">Sinkronisasi Data</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Selaraskan data manual di Google Sheet dan aplikasi</p>
            </div>
          </div>

          {syncSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{syncSuccess}</span>
            </div>
          )}

          {syncError && (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="break-words select-all">{syncError}</span>
              </div>
              {renderTroubleshooting(syncError)}
            </div>
          )}

          {!isConnected ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Google Sheets belum terhubung</p>
              <p className="text-[11px]">Masukkan Web App URL di atas dan klik hubungkan untuk mengaktifkan fitur sinkronisasi data.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Option 1: Two-way sync / Merge (Recommended) */}
              <div className="p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-blue-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Sinkronisasi 2-Arah (Gabung)
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                      Menggabungkan data lokal aplikasi & Google Sheet secara cerdas. Data baru dari kedua pihak disatukan tanpa menimpa secara sepihak.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-sync-merge"
                  disabled={syncLoading}
                  onClick={handleSyncMerge}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? 'Sinkronisasi...' : 'Mulai Gabungkan Data (Rekomendasi)'}
                </button>
              </div>

              {/* Option 2: Pull Sync */}
              <div className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all space-y-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Tarik Data dari Google Sheet
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    Menghapus data lokal di aplikasi ini dan menggantinya 100% dengan data yang ada di Google Sheet saat ini.
                  </p>
                </div>
                <button
                  id="btn-sync-pull"
                  disabled={syncLoading}
                  onClick={handleSyncPull}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  {syncLoading ? 'Memproses...' : 'Tarik Data & Ganti Data Lokal'}
                </button>
              </div>

              {/* Option 3: Push Sync */}
              <div className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all space-y-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Kirim Data ke Google Sheet
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    Mengosongkan Google Sheet Anda dan mengisi ulangnya dengan seluruh data lokal yang tersimpan di aplikasi saat ini.
                  </p>
                </div>
                <button
                  id="btn-sync-push"
                  disabled={syncLoading}
                  onClick={handleSyncPush}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-[10px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  {syncLoading ? 'Memproses...' : 'Kirim Data & Timpa Google Sheet'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Database Struct Map */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold font-display">
            <Link className="w-4.5 h-4.5 text-blue-600" />
            <span>Struktur Otomatis Google Sheet</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Google Apps Script kami akan mendeteksi dan secara otomatis menginisialisasi 4 lembar kerja (sheets) berikut beserta kolom judulnya jika kosong:
          </p>
          <ul className="space-y-2 text-slate-600 font-mono text-[10px] bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
            <li>• <strong className="text-blue-600">SISWA</strong>: ID, NIS, Nama, Kelas, JK, Wali, No HP</li>
            <li>• <strong className="text-blue-600">PELANGGARAN</strong>: ID, Kode, Sanksi, Kategori, Poin</li>
            <li>• <strong className="text-blue-600">PENCATATAN</strong>: ID, Tgl, NIS, Nama, Kelas, Sanksi, Poin, Petugas, Ket</li>
            <li>• <strong className="text-blue-600">PEMBINAAN</strong>: ID, NIS, Nama, Total Poin, Tindakan, Tgl</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
