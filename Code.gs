/**
 * Google Apps Script - Sistem Pencatatan Pelanggaran & Layanan BK Terpadu
 * 
 * SCRIPT SETUP:
 * 1. Buka Google Sheets, buat spreadsheet baru atau gunakan spreadsheet yang sudah ada.
 * 2. Klik Ekstensi > Apps Script.
 * 3. Hapus kode bawaan dan tempel kode ini ke dalam editor.
 * 4. Klik ikon Simpan.
 * 5. Klik Penerapan (Deploy) > Kelola Penerapan (Manage Deployments) atau Penerapan Baru (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Deskripsi: Sistem Pelanggaran & BK Web API v3
 *    - Jalankan sebagai: "Saya" (Me - email anda)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone - ini penting agar aplikasi web bisa mengaksesnya).
 * 8. Klik Terapkan (Deploy). Berikan izin akses (Authorize Access) jika diminta.
 * 9. Salin URL Aplikasi Web yang diberikan, lalu masukkan ke panel Setup di aplikasi web atau .env.
 */

// =========================================================================================
// PENGATURAN SPREADSHEET (PENTING JIKA SKRIP MANDIRI)
// Jika skrip dibuat dari menu "Ekstensi > Apps Script" langsung di spreadsheet, biarkan kosong "".
// Jika skrip dibuat mandiri dari script.google.com, MASUKKAN ID SPREADSHEET DI DALAM TANDA KUTIP:
// Contoh: var SPREADSHEET_ID = "1ZleTwWhcFvS0nTaNPaN8GVlFkY2tcUGaTYipkjWIUlY";
var SPREADSHEET_ID = ""; 
// =========================================================================================

function getTargetSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error("Spreadsheet tidak ditemukan! Harap isi var SPREADSHEET_ID = 'ID_SPREADSHEET_ANDA' pada baris atas skrip.");
  }
  return active;
}

/**
 * Jalankan fungsi ini (klik Run/Jalankan) untuk menguji koneksi & memberikan izin Google pertama kali!
 */
function testKoneksi() {
  var ss = getTargetSpreadsheet();
  Logger.log("BERHASIL TERHUBUNG KE SPREADSHEET: " + ss.getName());
  initializeSheets(ss);
  Logger.log("SEMUA TAB SHEET BERHASIL DIINISIALISASI & SIAP DIGUNAKAN!");
  return "SUKSES: " + ss.getName();
}

// Helper: Mencari sheet berdasarkan daftar kemungkinan nama tab (alias)
function findSheetsByAliases(ss, aliasList) {
  var matched = [];
  for (var i = 0; i < aliasList.length; i++) {
    var sh = ss.getSheetByName(aliasList[i]);
    if (sh) {
      matched.push(sh);
    }
  }
  return matched;
}

function getPrimarySheet(ss, aliasList, defaultName, defaultHeaders) {
  var matched = findSheetsByAliases(ss, aliasList);
  if (matched.length > 0) {
    return matched[0];
  }
  var newSh = ss.insertSheet(defaultName);
  if (defaultHeaders && defaultHeaders.length > 0) {
    newSh.appendRow(defaultHeaders);
  }
  return newSh;
}

// Master Pelanggaran Bawaan
var DEFAULT_MASTER_PELANGGARAN_GS = [
  ['P_P01', 'P01', 'Terlambat masuk sekolah / kelas (< 15 menit)', 'Ringan', 5],
  ['P_P02', 'P02', 'Terlambat masuk sekolah (> 15 menit)', 'Ringan', 10],
  ['P_P03', 'P03', 'Tidak memakai atribut seragam lengkap (topi/dasi/ikat pinggang/kaos kaki)', 'Ringan', 5],
  ['P_P04', 'P04', 'Memakai seragam tidak sesuai ketentuan hari / baju tidak dimasukkan / tidak rapi', 'Ringan', 5],
  ['P_P05', 'P05', 'Rambut gondrong / diwarnai / tidak sesuai ketentuan sekolah', 'Ringan', 10],
  ['P_P06', 'P06', 'Membuang sampah sembarangan di lingkungan sekolah', 'Ringan', 5],
  ['P_P07', 'P07', 'Menggunakan HP / gadget tanpa izin guru saat jam pelajaran (KBM)', 'Ringan', 10],
  ['P_P08', 'P08', 'Makan / minum di dalam kelas saat kegiatan belajar mengajar berlangsung', 'Ringan', 5],
  ['P_P09', 'P09', 'Memakai make-up / perhiasan berlebihan / bertato / bertindik (putra)', 'Ringan', 10],
  ['P_P10', 'P10', 'Tidak membawa buku pelajaran / tidak mengerjakan tugas sekolah', 'Ringan', 5],
  ['P_P11', 'P11', 'Keluar kelas tanpa izin guru piket / guru pengajar saat KBM', 'Ringan', 5],
  ['P_P12', 'P12', 'Tidak mengikuti upacara bendera / apel pagi / pembiasaan tanpa izin', 'Ringan', 15],
  ['P_P13', 'P13', 'Tidak masuk sekolah tanpa keterangan / Alpa (1 hari)', 'Sedang', 20],
  ['P_P14', 'P14', 'Meninggalkan sekolah sebelum jam pelajaran usai tanpa izin (Membolos)', 'Sedang', 25],
  ['P_P15', 'P15', 'Melompati pagar / jendela / pintu gerbang sekolah', 'Sedang', 30],
  ['P_P16', 'P16', 'Mencontek / berbuat curang saat ulangan / ujian semester', 'Sedang', 25],
  ['P_P17', 'P17', 'Bersikap tidak sopan / membantah / menentang guru atau staf sekolah', 'Sedang', 30],
  ['P_P18', 'P18', 'Membawa / merokok / rokok elektrik (vape) di lingkungan sekolah', 'Sedang', 35],
  ['P_P19', 'P19', 'Mencoret-coret dinding, meja, kursi, merusak fasilitas sekolah (Vandalisme)', 'Sedang', 25],
  ['P_P20', 'P20', 'Mengendarai motor knalpot bising / ugal-ugalan di area sekolah', 'Sedang', 25],
  ['P_P21', 'P21', 'Mengintimidasi / mengejek / mengancam sesama siswa (Bullying verbal)', 'Sedang', 35],
  ['P_P22', 'P22', 'Membawa barang terlarang / bermain judi / kartu di sekolah', 'Sedang', 20],
  ['P_P23', 'P23', 'Terlibat perkelahian / tawuran antar siswa atau antar sekolah', 'Berat', 75],
  ['P_P24', 'P24', 'Membawa senjata tajam (sajam) / senjata api / benda berbahaya ke sekolah', 'Berat', 75],
  ['P_P25', 'P25', 'Melakukan pemalakan / pemerasan / pencurian uang atau barang milik orang lain', 'Berat', 50],
  ['P_P26', 'P26', 'Membawa / mengonsumsi / mengedarkan minuman keras / alkohol', 'Berat', 75],
  ['P_P27', 'P27', 'Membawa / menggunakan / mengedarkan narkoba atau obat-obatan terlarang', 'Berat', 100],
  ['P_P28', 'P28', 'Melakukan pelecehan seksual / perbuatan asusila di lingkungan sekolah', 'Berat', 100],
  ['P_P29', 'P29', 'Melakukan kekerasan fisik (Bullying fisik) yang mencederai orang lain', 'Berat', 75],
  ['P_P30', 'P30', 'Menyebarkan konten pornografi / mencemarkan nama baik sekolah di media sosial', 'Berat', 75],
  ['P_P31', 'P31', 'Memalsukan tanda tangan kepala sekolah / guru / surat izin sekolah', 'Berat', 50]
];

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getStudents';
  var sheet = getTargetSpreadsheet();
  
  initializeSheets(sheet);
  
  try {
    var responseData;
    if (action === 'getStudents') {
      responseData = getStudents(sheet);
    } else if (action === 'getViolations') {
      responseData = getViolations(sheet);
    } else if (action === 'getRecords') {
      responseData = getRecords(sheet);
    } else if (action === 'getKehadiran') {
      responseData = getKehadiran(sheet);
    } else if (action === 'getKonseling') {
      responseData = getKonseling(sheet);
    } else if (action === 'getAsesmen') {
      responseData = getAsesmen(sheet);
    } else if (action === 'getKunjungan') {
      responseData = getKunjungan(sheet);
    } else if (action === 'getSnbp') {
      responseData = getSnbp(sheet);
    } else if (action === 'getAllData') {
      responseData = {
        siswa: getStudents(sheet),
        pelanggaran: getViolations(sheet),
        pencatatan: getRecords(sheet).pencatatan,
        pembinaan: getRecords(sheet).pembinaan,
        kehadiran: getKehadiran(sheet),
        konseling: getKonseling(sheet),
        asesmen: getAsesmen(sheet),
        kunjungan: getKunjungan(sheet),
        snbp: getSnbp(sheet)
      };
    } else {
      return createJsonResponse({ success: false, message: 'Action tidak dikenali atau format GET salah' });
    }
    
    return createJsonResponse({ success: true, data: responseData });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Terjadi kesalahan: ' + error.toString() });
  }
}

function doPost(e) {
  var sheet = getTargetSpreadsheet();
  initializeSheets(sheet);
  
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    
    var action = (e && e.parameter && e.parameter.action) || postData.action;
    var responseData;
    var data = (postData.data !== undefined && postData.action !== undefined) ? postData.data : postData;
    
    if (action === 'addStudent') {
      responseData = addStudent(sheet, data);
    } else if (action === 'deleteStudent') {
      responseData = deleteStudent(sheet, data);
    } else if (action === 'addViolation') {
      responseData = addViolation(sheet, data);
    } else if (action === 'deleteViolation') {
      responseData = deleteViolation(sheet, data);
    } else if (action === 'addRecord') {
      responseData = addRecord(sheet, data);
    } else if (action === 'deleteRecord') {
      responseData = deleteRecord(sheet, data);
    } else if (action === 'addKehadiran') {
      responseData = addKehadiran(sheet, data);
    } else if (action === 'deleteKehadiran') {
      responseData = deleteKehadiran(sheet, data);
    } else if (action === 'addKonseling') {
      responseData = addKonseling(sheet, data);
    } else if (action === 'deleteKonseling') {
      responseData = deleteKonseling(sheet, data);
    } else if (action === 'addAsesmen') {
      responseData = addAsesmen(sheet, data);
    } else if (action === 'deleteAsesmen') {
      responseData = deleteAsesmen(sheet, data);
    } else if (action === 'addKunjungan') {
      responseData = addKunjungan(sheet, data);
    } else if (action === 'deleteKunjungan') {
      responseData = deleteKunjungan(sheet, data);
    } else if (action === 'addSnbp') {
      responseData = addSnbp(sheet, data);
    } else if (action === 'deleteSnbp') {
      responseData = deleteSnbp(sheet, data);
    } else if (action === 'overwriteAllData') {
      responseData = overwriteAllData(sheet, data);
    } else {
      return createJsonResponse({ success: false, message: 'Action tidak dikenali atau format POST salah. Action: ' + action });
    }
    
    return createJsonResponse({ success: true, message: 'Operasi berhasil', data: responseData });
  } catch (error) {
    return createJsonResponse({ success: false, message: 'Terjadi kesalahan POST: ' + error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Inisialisasi sheet-sheet
function initializeSheets(ss) {
  if (!ss) {
    ss = getTargetSpreadsheet();
  }
  var sheets = {
    'DATA_SISWA': ['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP', 'Foto'],
    'PELANGGARAN': ['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin'],
    'PENCATATAN_PELANGGARAN': ['ID', 'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Kode Pelanggaran', 'Jenis Pelanggaran', 'Poin', 'Petugas', 'Keterangan', 'Foto'],
    'PEMBINAAN': ['ID', 'NIS', 'Nama Siswa', 'Total Poin', 'Tindakan', 'Tanggal'],
    'KEHADIRAN': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan'],
    'KONSELING': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Konseling', 'Tanggal', 'Permasalahan Utama', 'Analisis BK', 'Solusi Rekomendasi', 'Hasil Evaluasi', 'Tindak Lanjut', 'Petugas'],
    'ASESMEN': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Hasil AKPD', 'Gaya Belajar', 'AUM', 'Psikotes', 'Minat Bakat'],
    'KUNJUNGAN_RUMAH': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Tanggal Kunjungan', 'Tujuan Kunjungan', 'Hasil Temuan', 'Petugas'],
    'SNBP': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Universitas', 'Program Studi', 'Status Kelulusan', 'Tahun', 'Catatan']
  };
  
  for (var name in sheets) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      // Periksa apakah ada sheet alias alternatif yang sudah ada
      var aliases = [name];
      if (name === 'DATA_SISWA') aliases = ['SISWA', 'DATA_SISWA', 'DATA SISWA'];
      if (name === 'PELANGGARAN') aliases = ['PELANGGARAN', 'MASTER_PELANGGARAN', 'MASTER PELANGGARAN'];
      if (name === 'PENCATATAN_PELANGGARAN') aliases = ['PENCATATAN_PELANGGARAN', 'PENCATATAN', 'PENCATATAN PELANGGARAN'];
      if (name === 'PEMBINAAN') aliases = ['PEMBINAAN', 'REKAP_PEMBINAAN'];
      if (name === 'KEHADIRAN') aliases = ['KEHADIRAN', 'REKAP_KEHADIRAN', 'ABSENSI'];
      if (name === 'KONSELING') aliases = ['KONSELING', 'LAYANAN_BK', 'LAYANAN_KONSELING'];
      if (name === 'ASESMEN') aliases = ['ASESMEN', 'ASESMEN_BK'];
      if (name === 'KUNJUNGAN_RUMAH') aliases = ['KUNJUNGAN_RUMAH', 'HOME_VISIT'];
      if (name === 'SNBP') aliases = ['SNBP', 'SNBP_KARIR'];
      
      var found = findSheetsByAliases(ss, aliases);
      if (found.length === 0) {
        sh = ss.insertSheet(name);
        sh.appendRow(sheets[name]);
      }
    }
  }
}

// Helper: Membaca sheet menjadi array of object
function getSheetData(sh) {
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var list = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j] || '').trim();
      if (headerKey) {
        item[headerKey] = row[j];
      }
    }
    list.push(item);
  }
  return list;
}

// Helper cerdas: Mencari nilai kolom berdasarkan variasi nama header
function getColValue(item, candidates, defaultVal) {
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (item[c] !== undefined && item[c] !== null && String(item[c]).trim() !== '') {
      return item[c];
    }
    // Coba case-insensitive
    for (var key in item) {
      if (key.toLowerCase().replace(/[\s_]/g, '') === c.toLowerCase().replace(/[\s_]/g, '')) {
        if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
          return item[key];
        }
      }
    }
  }
  return defaultVal !== undefined ? defaultVal : '';
}

// 1. GET STUDENTS (Mendukung SISWA / DATA_SISWA)
function getStudents(ss) {
  var sheets = findSheetsByAliases(ss, ['DATA_SISWA', 'SISWA', 'DATA SISWA', 'Siswa', 'Data Siswa']);
  var rawData = [];
  
  if (sheets.length > 0) {
    for (var s = 0; s < sheets.length; s++) {
      var data = getSheetData(sheets[s]);
      if (data.length > rawData.length) {
        rawData = data;
      }
    }
  }
  
  return rawData.map(function(item, idx) {
    var id = String(getColValue(item, ['ID', 'id'], 'S_' + (getColValue(item, ['NIS', 'nis', 'NISN']) || (idx + 1))));
    var nis = String(getColValue(item, ['NIS', 'nis', 'NISN', 'No Induk'], ''));
    var nama = String(getColValue(item, ['Nama', 'Nama Siswa', 'NAMA', 'NAMA SISWA', 'NAMA_SISWA'], ''));
    var kelas = String(getColValue(item, ['Kelas', 'KELAS', 'Rombel', 'Kelas/Rombel'], ''));
    var jkVal = String(getColValue(item, ['JK', 'Jenis Kelamin', 'L/P', 'Gender'], 'L')).toUpperCase();
    var jk = jkVal.startsWith('P') ? 'P' : 'L';
    var namaOrtu = String(getColValue(item, ['Nama Orang Tua', 'Nama Ortu', 'Orang Tua', 'Wali', 'NAMA_ORANG_TUA'], ''));
    var noHp = String(getColValue(item, ['No HP', 'No Telepon', 'Telepon', 'No WA', 'NO_HP'], ''));
    var foto = String(getColValue(item, ['Foto', 'Photo', 'FOTO'], ''));
    
    return {
      id: id,
      nis: nis,
      nama: nama,
      kelas: kelas,
      jk: jk,
      namaOrangTua: namaOrtu,
      noHp: noHp,
      foto: foto
    };
  }).filter(function(s) {
    return s.nama && s.nama.trim() !== '';
  });
}

// 2. GET VIOLATIONS (Mendukung PELANGGARAN / MASTER_PELANGGARAN)
function getViolations(ss) {
  var sheets = findSheetsByAliases(ss, ['PELANGGARAN', 'MASTER_PELANGGARAN', 'MASTER PELANGGARAN', 'DATA_PELANGGARAN', 'Pelanggaran']);
  var sh = sheets.length > 0 ? sheets[0] : null;
  
  if (!sh) {
    sh = ss.insertSheet('PELANGGARAN');
    sh.appendRow(['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
  }
  
  var rawData = getSheetData(sh);
  if (rawData.length === 0) {
    for (var i = 0; i < DEFAULT_MASTER_PELANGGARAN_GS.length; i++) {
      sh.appendRow(DEFAULT_MASTER_PELANGGARAN_GS[i]);
    }
    rawData = getSheetData(sh);
  }
  
  return rawData.map(function(item) {
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      kode: String(getColValue(item, ['Kode', 'KODE', 'Kode Pelanggaran', 'KODE_PELANGGARAN'], '')),
      namaPelanggaran: String(getColValue(item, ['Nama Pelanggaran', 'Nama', 'Jenis Pelanggaran', 'NAMA_PELANGGARAN', 'JENIS_PELANGGARAN'], '')),
      kategori: String(getColValue(item, ['Kategori', 'KATEGORI'], 'Ringan')),
      poin: Number(getColValue(item, ['Poin', 'POIN', 'Bobot Poin'], 0))
    };
  });
}

// 3. GET RECORDS (Pencatatan & Pembinaan)
function getRecords(ss) {
  var sheetsPencatatan = findSheetsByAliases(ss, ['PENCATATAN_PELANGGARAN', 'PENCATATAN', 'PENCATATAN PELANGGARAN', 'DATA_PELANGGARAN_SISWA', 'Catatan']);
  var rawPencatatan = [];
  if (sheetsPencatatan.length > 0) {
    for (var i = 0; i < sheetsPencatatan.length; i++) {
      var d = getSheetData(sheetsPencatatan[i]);
      if (d.length > rawPencatatan.length) {
        rawPencatatan = d;
      }
    }
  }
  
  var sheetsPembinaan = findSheetsByAliases(ss, ['PEMBINAAN', 'REKAP_PEMBINAAN', 'TINDAKAN_PEMBINAAN', 'Pembinaan']);
  var rawPembinaan = sheetsPembinaan.length > 0 ? getSheetData(sheetsPembinaan[0]) : [];
  
  var dataPencatatan = rawPencatatan.map(function(item) {
    var rawDate = String(getColValue(item, ['Tanggal', 'TANGGAL', 'Date', 'DATE'], ''));
    var cleanDate = rawDate ? rawDate.split('T')[0] : '';
    
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      tanggal: cleanDate,
      nis: String(getColValue(item, ['NIS', 'nis', 'NISN'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama', 'NAMA', 'SISWA', 'Siswa'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS', 'Rombel', 'ROMBEL'], '')),
      pelanggaran: String(getColValue(item, ['Jenis Pelanggaran', 'JENIS_PELANGGARAN', 'JENIS_PELANG', 'Pelanggaran', 'PELANGGARAN', 'Nama Pelanggaran', 'NAMA_PELANGGARAN', 'Kasus', 'KASUS'], '')),
      poin: Number(getColValue(item, ['Poin', 'POIN', 'Point', 'POINT', 'Bobot Poin'], 0)),
      petugas: String(getColValue(item, ['Petugas', 'PETUGAS', 'Guru Piket', 'Guru BK', 'Pencatat', 'PENCATAT'], '')),
      keterangan: String(getColValue(item, ['Keterangan', 'KETERANGAN', 'Catatan', 'CATATAN', 'Kronologi'], '')),
      foto: String(getColValue(item, ['Foto', 'FOTO', 'Photo', 'PHOTO', 'Bukti', 'BUKTI'], ''))
    };
  }).filter(function(r) {
    return (r.nis && r.nis.trim() !== '') || (r.namaSiswa && r.namaSiswa.trim() !== '');
  });
  
  var dataPembinaan = rawPembinaan.map(function(item) {
    var rawDate = String(getColValue(item, ['Tanggal', 'TANGGAL'], ''));
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      totalPoin: Number(getColValue(item, ['Total Poin', 'TOTAL_POIN', 'Poin'], 0)),
      tindakan: String(getColValue(item, ['Tindakan', 'TINDAKAN', 'Sanksi'], '')),
      tanggal: rawDate ? rawDate.split('T')[0] : ''
    };
  });
  
  return {
    pencatatan: dataPencatatan,
    pembinaan: dataPembinaan
  };
}

// 4. ADD STUDENT (Create / Update ke semua sheet siswa yang aktif)
function addStudent(ss, data) {
  var sheets = findSheetsByAliases(ss, ['DATA_SISWA', 'SISWA', 'DATA SISWA']);
  if (sheets.length === 0) {
    sheets = [ss.insertSheet('DATA_SISWA')];
    sheets[0].appendRow(['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP', 'Foto']);
  }
  
  var id = data.id || ('S' + Math.floor(1000 + Math.random() * 9000));
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    var foundRow = -1;
    
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(id) || (data.nis && String(values[i][1]) === String(data.nis))) {
        foundRow = i + 1;
        break;
      }
    }
    
    var rowData = [id, data.nis, data.nama, data.kelas, data.jk, data.namaOrangTua, data.noHp, data.foto || ''];
    if (foundRow !== -1) {
      sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sh.appendRow(rowData);
    }
  }
  
  return getStudents(ss);
}

// 5. DELETE STUDENT
function deleteStudent(ss, data) {
  var sheets = findSheetsByAliases(ss, ['DATA_SISWA', 'SISWA', 'DATA SISWA']);
  var id = data.id;
  var nisToDelete = '';
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === String(id) || (data.nis && String(values[i][1]) === String(data.nis))) {
        nisToDelete = String(values[i][1]);
        sh.deleteRow(i + 1);
        break;
      }
    }
  }
  
  return getStudents(ss);
}

// 6. ADD VIOLATION
function addViolation(ss, data) {
  var sheets = findSheetsByAliases(ss, ['PELANGGARAN', 'MASTER_PELANGGARAN']);
  if (sheets.length === 0) {
    sheets = [ss.insertSheet('PELANGGARAN')];
    sheets[0].appendRow(['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
  }
  
  var id = data.id || ('P' + Math.floor(1000 + Math.random() * 9000));
  var rowData = [id, data.kode, data.namaPelanggaran, data.kategori, Number(data.poin)];
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(id) || (data.kode && String(values[i][1]) === String(data.kode))) {
        foundRow = i + 1;
        break;
      }
    }
    if (foundRow !== -1) {
      sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sh.appendRow(rowData);
    }
  }
  
  return getViolations(ss);
}

// 7. DELETE VIOLATION
function deleteViolation(ss, data) {
  var sheets = findSheetsByAliases(ss, ['PELANGGARAN', 'MASTER_PELANGGARAN']);
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === String(data.id) || String(values[i][1]) === String(data.kode)) {
        sh.deleteRow(i + 1);
        break;
      }
    }
  }
  return getViolations(ss);
}

// 8. ADD RECORD (Simpan ke PENCATATAN_PELANGGARAN / PENCATATAN)
function addRecord(ss, data) {
  var studentList = getStudents(ss);
  var student = null;
  for (var i = 0; i < studentList.length; i++) {
    if (String(studentList[i].nis).trim() === String(data.nis).trim()) {
      student = studentList[i];
      break;
    }
  }
  
  var siswaNama = (data.namaSiswa && data.namaSiswa.trim() !== '') ? data.namaSiswa : (student ? student.nama : '');
  var siswaKelas = (data.kelas && data.kelas.trim() !== '') ? data.kelas : (student ? student.kelas : '');
  
  // Ambil poin & kode pelanggaran
  var violations = getViolations(ss);
  var poin = data.poin !== undefined ? Number(data.poin) : 0;
  var kodePel = data.kode || '';
  
  for (var j = 0; j < violations.length; j++) {
    if (violations[j].namaPelanggaran === data.pelanggaran) {
      if (poin === 0) poin = Number(violations[j].poin || 0);
      if (!kodePel) kodePel = violations[j].kode;
      break;
    }
  }
  
  var sheets = findSheetsByAliases(ss, ['PENCATATAN_PELANGGARAN', 'PENCATATAN', 'PENCATATAN PELANGGARAN', 'DATA_PELANGGARAN_SISWA']);
  if (sheets.length === 0) {
    var newSh = ss.insertSheet('PENCATATAN_PELANGGARAN');
    newSh.appendRow(['ID', 'TANGGAL', 'NIS', 'NAMA_SISWA', 'KELAS', 'KODE_PELANG', 'JENIS_PELANG', 'POIN', 'PETUGAS', 'KETERANGAN', 'FOTO']);
    sheets = [newSh];
  }
  
  var id = data.id || ('R' + Math.floor(1000 + Math.random() * 9000));
  var tanggal = (data.tanggal || new Date().toISOString()).split('T')[0];
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    var headers = values.length > 0 ? values[0] : [];
    var foundRow = -1;
    
    for (var k = 1; k < values.length; k++) {
      if (String(values[k][0]).trim() === String(id).trim()) {
        foundRow = k + 1;
        break;
      }
    }
    
    // Bangun baris data dinamis sesuai struktur header sheet yang sedang aktif
    var rowData = [];
    if (headers.length > 0) {
      for (var h = 0; h < headers.length; h++) {
        var hName = String(headers[h] || '').toUpperCase().replace(/[\s_]/g, '');
        if (hName === 'ID') rowData.push(id);
        else if (hName === 'TANGGAL' || hName === 'DATE') rowData.push(tanggal);
        else if (hName === 'NIS' || hName === 'NISN') rowData.push(data.nis);
        else if (hName === 'NAMASISWA' || hName === 'NAMA' || hName === 'SISWA') rowData.push(siswaNama);
        else if (hName === 'KELAS' || hName === 'ROMBEL') rowData.push(siswaKelas);
        else if (hName === 'KODEPELANGGARAN' || hName === 'KODEPELANG' || hName === 'KODE') rowData.push(kodePel);
        else if (hName === 'JENISPELANGGARAN' || hName === 'JENISPELANG' || hName === 'PELANGGARAN' || hName === 'KASUS' || hName === 'KASUSPELANGGARAN') rowData.push(data.pelanggaran);
        else if (hName === 'POIN' || hName === 'POINT' || hName === 'BOBOT') rowData.push(poin);
        else if (hName === 'PETUGAS' || hName === 'PENCATAT' || hName === 'GURU') rowData.push(data.petugas || '');
        else if (hName === 'KETERANGAN' || hName === 'CATATAN' || hName === 'KRONOLOGI') rowData.push(data.keterangan || '');
        else if (hName === 'FOTO' || hName === 'PHOTO' || hName === 'BUKTI') rowData.push(data.foto || '');
        else rowData.push('');
      }
    } else {
      rowData = [id, tanggal, data.nis, siswaNama, siswaKelas, kodePel, data.pelanggaran, poin, data.petugas, data.keterangan || '', data.foto || ''];
    }
    
    if (foundRow !== -1) {
      sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sh.appendRow(rowData);
    }
  }
  
  // Update hitungan pembinaan
  recalculatePembinaanForStudent(ss, data.nis, siswaNama, tanggal);
  
  return getRecords(ss);
}

// 9. DELETE RECORD
function deleteRecord(ss, data) {
  var sheets = findSheetsByAliases(ss, ['PENCATATAN_PELANGGARAN', 'PENCATATAN', 'PENCATATAN PELANGGARAN']);
  var nis = '';
  var siswaNama = '';
  
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    var values = sh.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === String(data.id)) {
        nis = String(values[i][2] || '');
        siswaNama = String(values[i][3] || '');
        sh.deleteRow(i + 1);
        break;
      }
    }
  }
  
  if (nis) {
    recalculatePembinaanForStudent(ss, nis, siswaNama, new Date().toISOString().split('T')[0]);
  }
  
  return getRecords(ss);
}

// Helper: Hitung otomatis poin kumulatif dan update sheet PEMBINAAN
function recalculatePembinaanForStudent(ss, nis, namaSiswa, tanggalPencatatan) {
  var records = getRecords(ss).pencatatan;
  var totalPoints = 0;
  
  for (var i = 0; i < records.length; i++) {
    if (String(records[i].nis) === String(nis)) {
      totalPoints += Number(records[i].poin || 0);
    }
  }
  
  var sh = getPrimarySheet(ss, ['PEMBINAAN', 'REKAP_PEMBINAAN'], 'PEMBINAAN', ['ID', 'NIS', 'Nama Siswa', 'Total Poin', 'Tindakan', 'Tanggal']);
  var values = sh.getDataRange().getValues();
  var foundRow = -1;
  
  for (var j = 1; j < values.length; j++) {
    if (String(values[j][1]) === String(nis)) {
      foundRow = j + 1;
      break;
    }
  }
  
  if (totalPoints === 0) {
    if (foundRow !== -1) {
      sh.deleteRow(foundRow);
    }
    return;
  }
  
  var tindakan = 'Teguran Lisan';
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
  
  var id = foundRow !== -1 ? String(values[foundRow - 1][0]) : ('B' + Math.floor(1000 + Math.random() * 9000));
  var rowData = [id, nis, namaSiswa, totalPoints, tindakan, tanggalPencatatan];
  
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
}

// 10. GET & ADD KEHADIRAN
function getKehadiran(ss) {
  var sh = getPrimarySheet(ss, ['KEHADIRAN', 'REKAP_KEHADIRAN', 'ABSENSI'], 'KEHADIRAN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
  var rawData = getSheetData(sh);
  
  return rawData.map(function(item) {
    var hadir = Number(getColValue(item, ['Hadir', 'HADIR'], 0));
    var sakit = Number(getColValue(item, ['Sakit', 'SAKIT'], 0));
    var izin = Number(getColValue(item, ['Izin', 'IZIN'], 0));
    var alfa = Number(getColValue(item, ['Alfa', 'ALFA'], 0));
    var jumlah = Number(getColValue(item, ['Jumlah', 'JUMLAH'], hadir + sakit + izin + alfa));
    var status = String(getColValue(item, ['Status', 'STATUS'], hadir > 0 ? 'Hadir' : (sakit > 0 ? 'Sakit' : (izin > 0 ? 'Izin' : 'Alfa'))));
    
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS'], '')),
      mingguKe: String(getColValue(item, ['Minggu Ke', 'MINGGU_KE', 'Minggu'], '')),
      bulan: String(getColValue(item, ['Bulan', 'BULAN'], '')),
      tahun: String(getColValue(item, ['Tahun', 'TAHUN'], '')),
      hadir: hadir,
      sakit: sakit,
      izin: izin,
      alfa: alfa,
      jumlah: jumlah,
      status: status,
      keterangan: String(getColValue(item, ['Keterangan', 'KETERANGAN'], ''))
    };
  });
}

function addKehadiran(ss, data) {
  var sh = getPrimarySheet(ss, ['KEHADIRAN', 'REKAP_KEHADIRAN', 'ABSENSI'], 'KEHADIRAN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
  var values = sh.getDataRange().getValues();
  var id = data.id || ('H-' + new Date().getTime());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    var isSameId = String(values[i][0]) === String(id);
    var isSameWeek = String(values[i][1]) === String(data.nis) && 
                     String(values[i][4]) === String(data.mingguKe) && 
                     String(values[i][5]) === String(data.bulan) && 
                     String(values[i][6]) === String(data.tahun);
    if (isSameId || isSameWeek) {
      foundRow = i + 1;
      break;
    }
  }
  
  var hadir = Number(data.hadir || 0);
  var sakit = Number(data.sakit || 0);
  var izin = Number(data.izin || 0);
  var alfa = Number(data.alfa || 0);
  var jumlah = Number(data.jumlah !== undefined ? data.jumlah : (hadir + sakit + izin + alfa));
  var status = data.status || (hadir > 0 ? 'Hadir' : (sakit > 0 ? 'Sakit' : (izin > 0 ? 'Izin' : 'Alfa')));
  
  var rowData = [id, data.nis, data.namaSiswa, data.kelas, data.mingguKe, data.bulan, data.tahun, hadir, sakit, izin, alfa, jumlah, status, data.keterangan || ''];
  
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getKehadiran(ss);
}

function deleteKehadiran(ss, data) {
  var sh = getPrimarySheet(ss, ['KEHADIRAN', 'REKAP_KEHADIRAN', 'ABSENSI'], 'KEHADIRAN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return getKehadiran(ss);
}

// 11. LAYANAN BK: KONSELING
function getKonseling(ss) {
  var sh = getPrimarySheet(ss, ['KONSELING', 'LAYANAN_BK', 'LAYANAN_KONSELING'], 'KONSELING', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Konseling', 'Tanggal', 'Permasalahan Utama', 'Analisis BK', 'Solusi Rekomendasi', 'Hasil Evaluasi', 'Tindak Lanjut', 'Petugas']);
  var rawData = getSheetData(sh);
  return rawData.map(function(item) {
    var rawDate = String(getColValue(item, ['Tanggal', 'TANGGAL'], ''));
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS'], '')),
      jenisKonseling: String(getColValue(item, ['Jenis Konseling', 'JENIS_KONSELING', 'Jenis'], 'Individu')),
      tanggal: rawDate ? rawDate.split('T')[0] : '',
      permasalahanUtama: String(getColValue(item, ['Permasalahan Utama', 'PERMASALAHAN_UTAMA', 'Masalah'], '')),
      analisisBK: String(getColValue(item, ['Analisis BK', 'ANALISIS_BK', 'Analisis'], '')),
      solusiRekomendasi: String(getColValue(item, ['Solusi Rekomendasi', 'SOLUSI_REKOMENDASI', 'Solusi'], '')),
      hasilEvaluasi: String(getColValue(item, ['Hasil Evaluasi', 'HASIL_EVALUASI', 'Evaluasi'], '')),
      tindakLanjut: String(getColValue(item, ['Tindak Lanjut', 'TINDAK_LANJUT'], '')),
      petugas: String(getColValue(item, ['Petugas', 'PETUGAS', 'Guru BK'], ''))
    };
  });
}

function addKonseling(ss, data) {
  var sh = getPrimarySheet(ss, ['KONSELING', 'LAYANAN_BK', 'LAYANAN_KONSELING'], 'KONSELING', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Konseling', 'Tanggal', 'Permasalahan Utama', 'Analisis BK', 'Solusi Rekomendasi', 'Hasil Evaluasi', 'Tindak Lanjut', 'Petugas']);
  var values = sh.getDataRange().getValues();
  var id = data.id || ('K-' + Date.now());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowData = [
    id,
    data.nis,
    data.namaSiswa,
    data.kelas,
    data.jenisKonseling || 'Individu',
    data.tanggal || new Date().toISOString().split('T')[0],
    data.permasalahanUtama || '',
    data.analisisBK || '',
    data.solusiRekomendasi || '',
    data.hasilEvaluasi || '',
    data.tindakLanjut || '',
    data.petugas || ''
  ];
  
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getKonseling(ss);
}

function deleteKonseling(ss, data) {
  var sh = getPrimarySheet(ss, ['KONSELING', 'LAYANAN_BK'], 'KONSELING', []);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return getKonseling(ss);
}

// 12. LAYANAN BK: ASESMEN
function getAsesmen(ss) {
  var sh = getPrimarySheet(ss, ['ASESMEN', 'ASESMEN_BK'], 'ASESMEN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Hasil AKPD', 'Gaya Belajar', 'AUM', 'Psikotes', 'Minat Bakat']);
  var rawData = getSheetData(sh);
  return rawData.map(function(item) {
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS'], '')),
      hasilAKPD: String(getColValue(item, ['Hasil AKPD', 'HASIL_AKPD', 'AKPD'], '')),
      gayaBelajar: String(getColValue(item, ['Gaya Belajar', 'GAYA_BELAJAR'], '')),
      aum: String(getColValue(item, ['AUM', 'aum'], '')),
      psikotes: String(getColValue(item, ['Psikotes', 'PSIKOTES'], '')),
      minatBakat: String(getColValue(item, ['Minat Bakat', 'MINAT_BAKAT'], ''))
    };
  });
}

function addAsesmen(ss, data) {
  var sh = getPrimarySheet(ss, ['ASESMEN', 'ASESMEN_BK'], 'ASESMEN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Hasil AKPD', 'Gaya Belajar', 'AUM', 'Psikotes', 'Minat Bakat']);
  var values = sh.getDataRange().getValues();
  var id = data.id || ('A-' + Date.now());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id) || (data.nis && String(values[i][1]) === String(data.nis))) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowData = [id, data.nis, data.namaSiswa, data.kelas, data.hasilAKPD || '', data.gayaBelajar || '', data.aum || '', data.psikotes || '', data.minatBakat || ''];
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getAsesmen(ss);
}

function deleteAsesmen(ss, data) {
  var sh = getPrimarySheet(ss, ['ASESMEN', 'ASESMEN_BK'], 'ASESMEN', []);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.id) || (data.nis && String(values[i][1]) === String(data.nis))) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return getAsesmen(ss);
}

// 13. LAYANAN BK: KUNJUNGAN RUMAH (HOME VISIT)
function getKunjungan(ss) {
  var sh = getPrimarySheet(ss, ['KUNJUNGAN_RUMAH', 'HOME_VISIT', 'HOME VISIT'], 'KUNJUNGAN_RUMAH', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Tanggal Kunjungan', 'Tujuan Kunjungan', 'Hasil Temuan', 'Petugas']);
  var rawData = getSheetData(sh);
  return rawData.map(function(item) {
    var rawDate = String(getColValue(item, ['Tanggal Kunjungan', 'TANGGAL_KUNJUNGAN', 'Tanggal'], ''));
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS'], '')),
      tanggalKunjungan: rawDate ? rawDate.split('T')[0] : '',
      tujuanKunjungan: String(getColValue(item, ['Tujuan Kunjungan', 'TUJUAN_KUNJUNGAN', 'Tujuan'], '')),
      hasilTemuan: String(getColValue(item, ['Hasil Temuan', 'HASIL_TEMUAN', 'Hasil'], '')),
      petugas: String(getColValue(item, ['Petugas', 'PETUGAS'], ''))
    };
  });
}

function addKunjungan(ss, data) {
  var sh = getPrimarySheet(ss, ['KUNJUNGAN_RUMAH', 'HOME_VISIT'], 'KUNJUNGAN_RUMAH', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Tanggal Kunjungan', 'Tujuan Kunjungan', 'Hasil Temuan', 'Petugas']);
  var values = sh.getDataRange().getValues();
  var id = data.id || ('V-' + Date.now());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowData = [id, data.nis, data.namaSiswa, data.kelas, data.tanggalKunjungan || new Date().toISOString().split('T')[0], data.tujuanKunjungan || '', data.hasilTemuan || '', data.petugas || ''];
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getKunjungan(ss);
}

function deleteKunjungan(ss, data) {
  var sh = getPrimarySheet(ss, ['KUNJUNGAN_RUMAH', 'HOME_VISIT'], 'KUNJUNGAN_RUMAH', []);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return getKunjungan(ss);
}

// 14. LAYANAN BK: SNBP / KARIR
function getSnbp(ss) {
  var sh = getPrimarySheet(ss, ['SNBP', 'SNBP_KARIR'], 'SNBP', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Universitas', 'Program Studi', 'Status Kelulusan', 'Tahun', 'Catatan']);
  var rawData = getSheetData(sh);
  return rawData.map(function(item) {
    return {
      id: String(getColValue(item, ['ID', 'id'], '')),
      nis: String(getColValue(item, ['NIS', 'nis'], '')),
      namaSiswa: String(getColValue(item, ['Nama Siswa', 'NAMA_SISWA', 'Nama'], '')),
      kelas: String(getColValue(item, ['Kelas', 'KELAS'], '')),
      namaUniversitas: String(getColValue(item, ['Universitas', 'NAMA_UNIVERSITAS', 'Perguruan Tinggi'], '')),
      programStudi: String(getColValue(item, ['Program Studi', 'PROGRAM_STUDI', 'Jurusan'], '')),
      keteranganLulus: String(getColValue(item, ['Status Kelulusan', 'KETERANGAN_LULUS', 'Status'], 'Lulus')),
      tahun: String(getColValue(item, ['Tahun', 'TAHUN'], new Date().getFullYear().toString())),
      catatan: String(getColValue(item, ['Catatan', 'CATATAN'], ''))
    };
  });
}

function addSnbp(ss, data) {
  var sh = getPrimarySheet(ss, ['SNBP', 'SNBP_KARIR'], 'SNBP', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Universitas', 'Program Studi', 'Status Kelulusan', 'Tahun', 'Catatan']);
  var values = sh.getDataRange().getValues();
  var id = data.id || ('S-' + Date.now());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id) || (data.nis && String(values[i][1]) === String(data.nis))) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowData = [id, data.nis, data.namaSiswa, data.kelas, data.namaUniversitas || '', data.programStudi || '', data.keteranganLulus || 'Lulus', data.tahun || new Date().getFullYear().toString(), data.catatan || ''];
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getSnbp(ss);
}

function deleteSnbp(ss, data) {
  var sh = getPrimarySheet(ss, ['SNBP', 'SNBP_KARIR'], 'SNBP', []);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return getSnbp(ss);
}

// 15. OVERWRITE ALL DATA FOR BULK SYNC (Ultra Fast Batch Writing)
function overwriteAllData(ss, data) {
  // Overwrite DATA_SISWA / SISWA
  var shSiswa = getPrimarySheet(ss, ['DATA_SISWA', 'SISWA'], 'DATA_SISWA', ['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP', 'Foto']);
  if (shSiswa) {
    shSiswa.clearContents();
    shSiswa.appendRow(['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP', 'Foto']);
    if (data.siswa && data.siswa.length > 0) {
      var siswaRows = data.siswa.map(function(s) {
        return [
          String(s.id || ''),
          String(s.nis || ''),
          String(s.nama || ''),
          String(s.kelas || ''),
          String(s.jk || 'L'),
          String(s.namaOrangTua || ''),
          String(s.noHp || ''),
          String(s.foto || '')
        ];
      });
      shSiswa.getRange(2, 1, siswaRows.length, 8).setValues(siswaRows);
    }
  }

  // Overwrite PELANGGARAN / MASTER_PELANGGARAN
  var shPelanggaran = getPrimarySheet(ss, ['PELANGGARAN', 'MASTER_PELANGGARAN'], 'PELANGGARAN', ['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
  if (shPelanggaran) {
    shPelanggaran.clearContents();
    shPelanggaran.appendRow(['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
    var violationsToWrite = (data.pelanggaran && data.pelanggaran.length > 0) ? data.pelanggaran : DEFAULT_MASTER_PELANGGARAN_GS.map(function(v) {
      return { id: v[0], kode: v[1], namaPelanggaran: v[2], kategori: v[3], poin: v[4] };
    });
    
    var pelRows = violationsToWrite.map(function(v) {
      return [
        String(v.id || ''),
        String(v.kode || ''),
        String(v.namaPelanggaran || ''),
        String(v.kategori || 'Ringan'),
        Number(v.poin || 0)
      ];
    });
    shPelanggaran.getRange(2, 1, pelRows.length, 5).setValues(pelRows);
  }

  // Overwrite PENCATATAN_PELANGGARAN
  var shPencatatan = getPrimarySheet(ss, ['PENCATATAN_PELANGGARAN', 'PENCATATAN'], 'PENCATATAN_PELANGGARAN', ['ID', 'TANGGAL', 'NIS', 'NAMA_SISWA', 'KELAS', 'KODE_PELANGGARAN', 'JENIS_PELANGGARAN', 'POIN', 'PETUGAS', 'KETERANGAN', 'FOTO']);
  if (shPencatatan) {
    shPencatatan.clearContents();
    shPencatatan.appendRow(['ID', 'TANGGAL', 'NIS', 'NAMA_SISWA', 'KELAS', 'KODE_PELANGGARAN', 'JENIS_PELANGGARAN', 'POIN', 'PETUGAS', 'KETERANGAN', 'FOTO']);
    if (data.pencatatan && data.pencatatan.length > 0) {
      var pencRows = data.pencatatan.map(function(r) {
        var cleanDate = r.tanggal || '';
        if (cleanDate && cleanDate.indexOf('T') !== -1) {
          cleanDate = cleanDate.split('T')[0];
        }
        return [
          String(r.id || ''),
          cleanDate,
          String(r.nis || ''),
          String(r.namaSiswa || ''),
          String(r.kelas || ''),
          String(r.kode || r.kodePelanggaran || ''),
          String(r.pelanggaran || ''),
          Number(r.poin || 0),
          String(r.petugas || ''),
          String(r.keterangan || ''),
          String(r.foto || '')
        ];
      });
      shPencatatan.getRange(2, 1, pencRows.length, 11).setValues(pencRows);
    }
  }

  // Overwrite PEMBINAAN
  var shPembinaan = getPrimarySheet(ss, ['PEMBINAAN', 'REKAP_PEMBINAAN'], 'PEMBINAAN', ['ID', 'NIS', 'Nama Siswa', 'Total Poin', 'Tindakan', 'Tanggal']);
  if (shPembinaan) {
    shPembinaan.clearContents();
    shPembinaan.appendRow(['ID', 'NIS', 'Nama Siswa', 'Total Poin', 'Tindakan', 'Tanggal']);
    if (data.pembinaan && data.pembinaan.length > 0) {
      var pembRows = data.pembinaan.map(function(p) {
        var cleanDate = p.tanggal || '';
        if (cleanDate && cleanDate.indexOf('T') !== -1) {
          cleanDate = cleanDate.split('T')[0];
        }
        return [
          String(p.id || ''),
          String(p.nis || ''),
          String(p.namaSiswa || ''),
          Number(p.totalPoin || 0),
          String(p.tindakan || ''),
          cleanDate
        ];
      });
      shPembinaan.getRange(2, 1, pembRows.length, 6).setValues(pembRows);
    }
  }

  // Overwrite KEHADIRAN
  var shKehadiran = getPrimarySheet(ss, ['KEHADIRAN', 'REKAP_KEHADIRAN'], 'KEHADIRAN', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
  if (shKehadiran) {
    shKehadiran.clearContents();
    shKehadiran.appendRow(['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
    if (data.kehadiran && data.kehadiran.length > 0) {
      var kehRows = data.kehadiran.map(function(h) {
        var hHadir = Number(h.hadir || 0);
        var hSakit = Number(h.sakit || 0);
        var hIzin = Number(h.izin || 0);
        var hAlfa = Number(h.alfa || 0);
        var hJumlah = Number(h.jumlah !== undefined ? h.jumlah : (hHadir + hSakit + hIzin + hAlfa));
        var hStatus = h.status || (hHadir > 0 ? 'Hadir' : (hSakit > 0 ? 'Sakit' : (hIzin > 0 ? 'Izin' : 'Alfa')));
        return [
          String(h.id || ''),
          String(h.nis || ''),
          String(h.namaSiswa || ''),
          String(h.kelas || ''),
          String(h.mingguKe || ''),
          String(h.bulan || ''),
          String(h.tahun || ''),
          hHadir,
          hSakit,
          hIzin,
          hAlfa,
          hJumlah,
          hStatus,
          String(h.keterangan || '')
        ];
      });
      shKehadiran.getRange(2, 1, kehRows.length, 14).setValues(kehRows);
    }
  }

  // Overwrite KONSELING
  if (data.konseling && data.konseling.length > 0) {
    var shKonseling = getPrimarySheet(ss, ['KONSELING', 'LAYANAN_BK'], 'KONSELING', ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Konseling', 'Tanggal', 'Permasalahan Utama', 'Analisis BK', 'Solusi Rekomendasi', 'Hasil Evaluasi', 'Tindak Lanjut', 'Petugas']);
    shKonseling.clearContents();
    shKonseling.appendRow(['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Konseling', 'Tanggal', 'Permasalahan Utama', 'Analisis BK', 'Solusi Rekomendasi', 'Hasil Evaluasi', 'Tindak Lanjut', 'Petugas']);
    var konsRows = data.konseling.map(function(k) {
      return [
        String(k.id || ''),
        String(k.nis || ''),
        String(k.namaSiswa || ''),
        String(k.kelas || ''),
        String(k.jenisKonseling || 'Individu'),
        String(k.tanggal || '').split('T')[0],
        String(k.permasalahanUtama || ''),
        String(k.analisisBK || ''),
        String(k.solusiRekomendasi || ''),
        String(k.hasilEvaluasi || ''),
        String(k.tindakLanjut || ''),
        String(k.petugas || '')
      ];
    });
    shKonseling.getRange(2, 1, konsRows.length, 12).setValues(konsRows);
  }

  return { success: true, message: 'Semua data (Siswa, Pelanggaran, Pembinaan, Kehadiran, dan Layanan BK) berhasil disinkronkan ke Google Sheet!' };
}
