/**
 * Google Apps Script - Sistem Pencatatan Pelanggaran Siswa
 * 
 * SCRIPT SETUP:
 * 1. Buka Google Sheets, buat spreadsheet baru.
 * 2. Klik Ekstensi > Apps Script.
 * 3. Hapus kode bawaan dan tempel kode ini ke dalam editor.
 * 4. Klik ikon Simpan.
 * 5. Klik Penerapan (Deploy) > Penerapan Baru (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Deskripsi: Sistem Pelanggaran Web API
 *    - Jalankan sebagai: "Saya" (Me - email anda)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone - ini penting agar aplikasi web bisa mengaksesnya).
 * 8. Klik Terapkan (Deploy). Berikan izin akses (Authorize Access) jika diminta.
 * 9. Salin URL Aplikasi Web yang diberikan, lalu masukkan ke file .env atau panel Setup di aplikasi web.
 */

// =========================================================================================
// PENGATURAN SPREADSHEET (PENTING JIKA SKRIP MANDIRI)
// Jika skrip dibuat dari menu "Ekstensi > Apps Script" langsung di spreadsheet, biarkan kosong "".
// Jika skrip dibuat mandiri dari script.google.com, MASUKKAN ID SPREADSHEET DI DALAM TANDA KUTIP:
// Contoh: var SPREADSHEET_ID = "1ZiETwWhcFvS0nTaNPan8GVlFkY2tcUGaTYipkjWIUlY";
var SPREADSHEET_ID = ""; 
// =========================================================================================

function getTargetSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error("Spreadsheet tidak ditemukan! Harap isi var SPREADSHEET_ID = 'ID_SPREADSHEET_ANDA' pada baris 24.");
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
  Logger.log("SEMUA TAB SHEET (SISWA, PELANGGARAN, PENCATATAN, PEMBINAAN, KEHADIRAN) SIAP!");
  return "SUKSES: " + ss.getName();
}

function doGet(e) {
  var action = e.parameter.action;
  var sheet = getTargetSpreadsheet();
  
  // Pastikan sheet siap digunakan
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
    
    // Support action either in URL parameters or in the JSON payload body (robust against redirect issues)
    var action = (e && e.parameter && e.parameter.action) || postData.action;
    var responseData;
    
    // Support nested data under 'data' key or top-level payload structure
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

// Menghindari CORS dan mengembalikan output JSON
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Menginisialisasi sheet-sheet jika kosong / belum ada
function initializeSheets(ss) {
  if (!ss) {
    ss = getTargetSpreadsheet();
  }
  var sheets = {
    'SISWA': ['ID', 'NIS', 'Nama', 'Kelas', 'JK', 'Nama Orang Tua', 'No HP', 'Foto'],
    'PELANGGARAN': ['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin'],
    'PENCATATAN': ['ID', 'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Pelanggaran', 'Poin', 'Petugas', 'Keterangan', 'Foto'],
    'PEMBINAAN': ['ID', 'NIS', 'Nama Siswa', 'Total Poin', 'Tindakan', 'Tanggal'],
    'KEHADIRAN': ['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']
  };
  
  for (var name in sheets) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(sheets[name]);
      
      // Tambahkan data dummy awal jika ini sheet baru, agar tidak kosong
      if (name === 'SISWA') {
        sh.appendRow(['S001', '21001', 'Ahmad Fauzi', '9-A', 'L', 'Budi Fauzi', '081234567890']);
        sh.appendRow(['S002', '21002', 'Siti Nurhaliza', '9-A', 'P', 'Nurhalim', '081345678901']);
        sh.appendRow(['S003', '21003', 'Rizky Ramadhan', '8-B', 'L', 'Ramadhan', '081987654321']);
      } else if (name === 'PELANGGARAN') {
        sh.appendRow(['P001', 'PK01', 'Terlambat masuk sekolah', 'Ringan', '5']);
        sh.appendRow(['P002', 'PK02', 'Tidak memakai atribut seragam lengkap', 'Ringan', '5']);
        sh.appendRow(['P003', 'PK03', 'Membawa HP/Gadget tanpa izin guru', 'Ringan', '10']);
        sh.appendRow(['P004', 'PS01', 'Membolos saat jam pelajaran', 'Sedang', '20']);
        sh.appendRow(['P005', 'PB01', 'Merokok atau membawa rokok di sekolah', 'Berat', '50']);
      }
    } else {
      // Sheet exists, heal missing headers
      var lastCol = sh.getLastColumn();
      if (lastCol > 0) {
        var existingHeaders = sh.getRange(1, 1, 1, lastCol).getValues()[0];
        var expectedHeaders = sheets[name];
        for (var i = 0; i < expectedHeaders.length; i++) {
          var expected = expectedHeaders[i];
          if (existingHeaders.indexOf(expected) === -1) {
            sh.getRange(1, sh.getLastColumn() + 1).setValue(expected);
          }
        }
      }
    }
  }
}

// Helper: Membaca sheet menjadi array of object
function getSheetData(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var list = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    list.push(item);
  }
  return list;
}

// 1. GET STUDENTS (Mendukung tab SISWA atau DATA_SISWA secara cerdas)
function getStudents(ss) {
  var sh = ss.getSheetByName('SISWA');
  var shAlt = ss.getSheetByName('DATA_SISWA');
  
  var rawData = [];
  if (sh && shAlt) {
    var d1 = getSheetData(sh);
    var d2 = getSheetData(shAlt);
    rawData = d1.length >= d2.length ? d1 : d2;
  } else if (sh) {
    rawData = getSheetData(sh);
  } else if (shAlt) {
    rawData = getSheetData(shAlt);
  }
  
  return rawData.map(function(item, idx) {
    var id = String(item['ID'] || item['id'] || ('S_' + (item['NIS'] || item['nis'] || (idx + 1))));
    var nis = String(item['NIS'] || item['nis'] || item['NISN'] || item['No Induk'] || '');
    var nama = String(item['Nama'] || item['Nama Siswa'] || item['NAMA'] || item['NAMA SISWA'] || '');
    var kelas = String(item['Kelas'] || item['KELAS'] || item['Rombel'] || '');
    var jk = String(item['JK'] || item['Jenis Kelamin'] || item['L/P'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
    var namaOrtu = String(item['Nama Orang Tua'] || item['Nama Ortu'] || item['Orang Tua'] || item['Wali'] || '');
    var noHp = String(item['No HP'] || item['No Telepon'] || item['Telepon'] || item['No WA'] || '');
    var foto = String(item['Foto'] || item['Photo'] || '');
    
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

// 2. GET VIOLATIONS
function getViolations(ss) {
  var sh = ss.getSheetByName('PELANGGARAN');
  if (!sh) {
    sh = ss.insertSheet('PELANGGARAN');
    sh.appendRow(['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
  }
  
  var rawData = getSheetData(sh);
  
  // Jika tab PELANGGARAN masih kosong atau baru dibuat, isi otomatis dengan 31 master aturan pelanggaran
  if (rawData.length === 0) {
    for (var i = 0; i < DEFAULT_MASTER_PELANGGARAN_GS.length; i++) {
      sh.appendRow(DEFAULT_MASTER_PELANGGARAN_GS[i]);
    }
    rawData = getSheetData(sh);
  }
  
  return rawData.map(function(item) {
    return {
      id: String(item['ID'] || ''),
      kode: String(item['Kode'] || ''),
      namaPelanggaran: String(item['Nama Pelanggaran'] || ''),
      kategori: String(item['Kategori'] || 'Ringan'),
      poin: Number(item['Poin'] || 0)
    };
  });
}

// 3. GET RECORDS (Pencatatan & Pembinaan)
function getRecords(ss) {
  var shPencatatan = ss.getSheetByName('PENCATATAN');
  var shPembinaan = ss.getSheetByName('PEMBINAAN');
  
  var dataPencatatan = getSheetData(shPencatatan).map(function(item) {
    return {
      id: String(item['ID'] || ''),
      tanggal: String(item['Tanggal'] || '').split('T')[0],
      nis: String(item['NIS'] || ''),
      namaSiswa: String(item['Nama Siswa'] || ''),
      kelas: String(item['Kelas'] || ''),
      pelanggaran: String(item['Pelanggaran'] || ''),
      poin: Number(item['Poin'] || 0),
      petugas: String(item['Petugas'] || ''),
      keterangan: String(item['Keterangan'] || ''),
      foto: String(item['Foto'] || '')
    };
  });
  
  var dataPembinaan = getSheetData(shPembinaan).map(function(item) {
    return {
      id: String(item['ID'] || ''),
      nis: String(item['NIS'] || ''),
      namaSiswa: String(item['Nama Siswa'] || ''),
      totalPoin: Number(item['Total Poin'] || 0),
      tindakan: String(item['Tindakan'] || ''),
      tanggal: String(item['Tanggal'] || '').split('T')[0]
    };
  });
  
  return {
    pencatatan: dataPencatatan,
    pembinaan: dataPembinaan
  };
}

// 4. ADD STUDENT (Create / Update)
function addStudent(ss, data) {
  var sh = ss.getSheetByName('SISWA');
  var values = sh.getDataRange().getValues();
  var id = data.id || ('S' + Math.floor(1000 + Math.random() * 9000));
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id) || (data.nis && String(values[i][1]) === String(data.nis))) {
      foundRow = i + 1; // 1-indexed for sheets
      break;
    }
  }
  
  var rowData = [id, data.nis, data.nama, data.kelas, data.jk, data.namaOrangTua, data.noHp, data.foto || ''];
  
  if (foundRow !== -1) {
    // Update existing
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Append new
    sh.appendRow(rowData);
  }
  
  return getStudents(ss);
}

// 5. DELETE STUDENT
function deleteStudent(ss, data) {
  var sh = ss.getSheetByName('SISWA');
  var values = sh.getDataRange().getValues();
  var id = data.id;
  var nisToDelete = '';
  
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      nisToDelete = String(values[i][1]);
      sh.deleteRow(i + 1);
      break;
    }
  }
  
  // Jika siswa dihapus, bersihkan pencatatan, pembinaan, dan kehadiran milik siswa tersebut
  if (nisToDelete) {
    var shPencatatan = ss.getSheetByName('PENCATATAN');
    if (shPencatatan) {
      var valPencatatan = shPencatatan.getDataRange().getValues();
      for (var j = valPencatatan.length - 1; j >= 1; j--) {
        if (String(valPencatatan[j][2]) === nisToDelete) {
          shPencatatan.deleteRow(j + 1);
        }
      }
    }
    
    var shPembinaan = ss.getSheetByName('PEMBINAAN');
    if (shPembinaan) {
      var valPembinaan = shPembinaan.getDataRange().getValues();
      for (var k = valPembinaan.length - 1; k >= 1; k--) {
        if (String(valPembinaan[k][1]) === nisToDelete) {
          shPembinaan.deleteRow(k + 1);
        }
      }
    }

    var shKehadiran = ss.getSheetByName('KEHADIRAN');
    if (shKehadiran) {
      var valKehadiran = shKehadiran.getDataRange().getValues();
      for (var m = valKehadiran.length - 1; m >= 1; m--) {
        if (String(valKehadiran[m][1]) === nisToDelete) {
          shKehadiran.deleteRow(m + 1);
        }
      }
    }
  }
  
  return getStudents(ss);
}

// 6. ADD VIOLATION (Create / Update)
function addViolation(ss, data) {
  var sh = ss.getSheetByName('PELANGGARAN');
  var values = sh.getDataRange().getValues();
  var id = data.id || ('P' + Math.floor(1000 + Math.random() * 9000));
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id) || (data.kode && String(values[i][1]) === String(data.kode))) {
      foundRow = i + 1;
      break;
    }
  }
  
  var rowData = [id, data.kode, data.namaPelanggaran, data.kategori, Number(data.poin)];
  
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getViolations(ss);
}

// 7. DELETE VIOLATION
function deleteViolation(ss, data) {
  var sh = ss.getSheetByName('PELANGGARAN');
  var values = sh.getDataRange().getValues();
  var id = data.id;
  
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  
  return getViolations(ss);
}

// 8. ADD RECORD
function addRecord(ss, data) {
  var shSiswa = ss.getSheetByName('SISWA');
  var valSiswa = shSiswa.getDataRange().getValues();
  var siswaNama = '';
  var siswaKelas = '';
  
  for (var i = 1; i < valSiswa.length; i++) {
    if (String(valSiswa[i][1]) === String(data.nis)) {
      siswaNama = valSiswa[i][2];
      siswaKelas = valSiswa[i][3];
      break;
    }
  }
  
  if (!siswaNama) {
    throw new Error('Siswa dengan NIS ' + data.nis + ' tidak ditemukan.');
  }
  
  // Ambil poin dari master pelanggaran
  var shViolations = ss.getSheetByName('PELANGGARAN');
  var valViolations = shViolations.getDataRange().getValues();
  var poin = 0;
  for (var j = 1; j < valViolations.length; j++) {
    if (String(valViolations[j][2]) === String(data.pelanggaran)) {
      poin = Number(valViolations[j][4]);
      break;
    }
  }
  
  var shPencatatan = ss.getSheetByName('PENCATATAN');
  var valPencatatan = shPencatatan.getDataRange().getValues();
  var id = data.id || ('R' + Math.floor(1000 + Math.random() * 9000));
  var foundRow = -1;
  
  for (var k = 1; k < valPencatatan.length; k++) {
    if (String(valPencatatan[k][0]) === String(id)) {
      foundRow = k + 1;
      break;
    }
  }
  
  var tanggal = data.tanggal || new Date().toISOString().split('T')[0];
  var rowData = [id, tanggal, data.nis, siswaNama, siswaKelas, data.pelanggaran, poin, data.petugas, data.keterangan || '', data.foto || ''];
  
  if (foundRow !== -1) {
    shPencatatan.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    shPencatatan.appendRow(rowData);
  }
  
  // Recalculate Pembinaan
  recalculatePembinaanForStudent(ss, data.nis, siswaNama, tanggal);
  
  return getRecords(ss);
}

// 9. DELETE RECORD
function deleteRecord(ss, data) {
  var shPencatatan = ss.getSheetByName('PENCATATAN');
  var valPencatatan = shPencatatan.getDataRange().getValues();
  var id = data.id;
  var nis = '';
  var siswaNama = '';
  
  for (var i = valPencatatan.length - 1; i >= 1; i--) {
    if (String(valPencatatan[i][0]) === String(id)) {
      nis = String(valPencatatan[i][2]);
      siswaNama = String(valPencatatan[i][3]);
      shPencatatan.deleteRow(i + 1);
      break;
    }
  }
  
  if (nis) {
    recalculatePembinaanForStudent(ss, nis, siswaNama, new Date().toISOString().split('T')[0]);
  }
  
  return getRecords(ss);
}

// Helper: Hitung otomatis poin kumulatif dan update sheet PEMBINAAN
function recalculatePembinaanForStudent(ss, nis, namaSiswa, tanggalPencatatan) {
  var shPencatatan = ss.getSheetByName('PENCATATAN');
  var valPencatatan = shPencatatan.getDataRange().getValues();
  var totalPoints = 0;
  
  for (var i = 1; i < valPencatatan.length; i++) {
    if (String(valPencatatan[i][2]) === String(nis)) {
      totalPoints += Number(valPencatatan[i][6] || 0);
    }
  }
  
  var shPembinaan = ss.getSheetByName('PEMBINAAN');
  var valPembinaan = shPembinaan.getDataRange().getValues();
  var foundRow = -1;
  
  for (var j = 1; j < valPembinaan.length; j++) {
    if (String(valPembinaan[j][1]) === String(nis)) {
      foundRow = j + 1;
      break;
    }
  }
  
  if (totalPoints === 0) {
    // Jika total poin 0, hapus dari baris pembinaan jika ada
    if (foundRow !== -1) {
      shPembinaan.deleteRow(foundRow);
    }
    return;
  }
  
  // Aturan Pembinaan
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
  
  var id = foundRow !== -1 ? String(valPembinaan[foundRow - 1][0]) : ('B' + Math.floor(1000 + Math.random() * 9000));
  var rowData = [id, nis, namaSiswa, totalPoints, tindakan, tanggalPencatatan];
  
  if (foundRow !== -1) {
    shPembinaan.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    shPembinaan.appendRow(rowData);
  }
}

// 10. GET KEHADIRAN
function getKehadiran(ss) {
  var sh = ss.getSheetByName('KEHADIRAN');
  if (!sh) return [];
  var rawData = getSheetData(sh);
  
  return rawData.map(function(item) {
    var hadir = Number(item['Hadir'] || 0);
    var sakit = Number(item['Sakit'] || 0);
    var izin = Number(item['Izin'] || 0);
    var alfa = Number(item['Alfa'] || 0);
    var jumlah = item['Jumlah'] !== undefined && item['Jumlah'] !== '' ? Number(item['Jumlah']) : (hadir + sakit + izin + alfa);
    var status = String(item['Status'] || (hadir > 0 ? 'Hadir' : (sakit > 0 ? 'Sakit' : (izin > 0 ? 'Izin' : 'Alfa'))));
    
    return {
      id: String(item['ID'] || ''),
      nis: String(item['NIS'] || ''),
      namaSiswa: String(item['Nama Siswa'] || ''),
      kelas: String(item['Kelas'] || ''),
      mingguKe: String(item['Minggu Ke'] || ''),
      bulan: String(item['Bulan'] || ''),
      tahun: String(item['Tahun'] || ''),
      hadir: hadir,
      sakit: sakit,
      izin: izin,
      alfa: alfa,
      jumlah: jumlah,
      status: status,
      keterangan: String(item['Keterangan'] || '')
    };
  });
}

// 11. ADD KEHADIRAN (Create / Update)
function addKehadiran(ss, data) {
  var sh = ss.getSheetByName('KEHADIRAN');
  if (!sh) {
    sh = ss.insertSheet('KEHADIRAN');
    sh.appendRow(['ID', 'NIS', 'Nama Siswa', 'Kelas', 'Minggu Ke', 'Bulan', 'Tahun', 'Hadir', 'Sakit', 'Izin', 'Alfa', 'Jumlah', 'Status', 'Keterangan']);
  }
  
  var values = sh.getDataRange().getValues();
  var id = data.id || ('H-' + new Date().getTime());
  var foundRow = -1;
  
  for (var i = 1; i < values.length; i++) {
    // Match by ID or by unique composite (NIS + MingguKe + Bulan + Tahun)
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
  
  var rowData = [
    id,
    data.nis,
    data.namaSiswa,
    data.kelas,
    data.mingguKe,
    data.bulan,
    data.tahun,
    hadir,
    sakit,
    izin,
    alfa,
    jumlah,
    status,
    data.keterangan || ''
  ];
  
  if (foundRow !== -1) {
    sh.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }
  
  return getKehadiran(ss);
}

// 12. DELETE KEHADIRAN
function deleteKehadiran(ss, data) {
  var sh = ss.getSheetByName('KEHADIRAN');
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  var id = data.id;
  
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  
  return getKehadiran(ss);
}

// 13. OVERWRITE ALL DATA FOR BULK SYNC (Ultra Fast Batch Writing)
function overwriteAllData(ss, data) {
  // Overwrite SISWA sheet
  var shSiswa = ss.getSheetByName('SISWA');
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

  // Overwrite PELANGGARAN sheet
  var shPelanggaran = ss.getSheetByName('PELANGGARAN');
  if (shPelanggaran) {
    shPelanggaran.clearContents();
    shPelanggaran.appendRow(['ID', 'Kode', 'Nama Pelanggaran', 'Kategori', 'Poin']);
    if (data.pelanggaran && data.pelanggaran.length > 0) {
      var pelRows = data.pelanggaran.map(function(v) {
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
  }

  // Overwrite PENCATATAN sheet
  var shPencatatan = ss.getSheetByName('PENCATATAN');
  if (shPencatatan) {
    shPencatatan.clearContents();
    shPencatatan.appendRow(['ID', 'Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Pelanggaran', 'Poin', 'Petugas', 'Keterangan', 'Foto']);
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
          String(r.pelanggaran || ''),
          Number(r.poin || 0),
          String(r.petugas || ''),
          String(r.keterangan || ''),
          String(r.foto || '')
        ];
      });
      shPencatatan.getRange(2, 1, pencRows.length, 10).setValues(pencRows);
    }
  }

  // Overwrite PEMBINAAN sheet
  var shPembinaan = ss.getSheetByName('PEMBINAAN');
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

  // Overwrite KEHADIRAN sheet
  var shKehadiran = ss.getSheetByName('KEHADIRAN');
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

  return { success: true, message: 'Semua data berhasil disinkronkan ke Google Sheet!' };
}

