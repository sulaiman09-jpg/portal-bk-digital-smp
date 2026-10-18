import { Siswa, Pelanggaran, Pencatatan, Pembinaan, KehadiranData, KonselingData, AsesmenData, KunjunganRumahData, SnbpData, ActionPlan, AuthResponse, ApiResponse } from '../types';

// Helper to get active auth token and Google Script URL for stateless serverless environments like Vercel
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const googleScriptUrl = localStorage.getItem('google_script_url') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(googleScriptUrl ? { 'x-google-script-url': googleScriptUrl } : {})
  };
}

export const googleSheetApi = {
  // 1. Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Gagal terhubung ke server.' };
    }
  },

  // 2. Fetch config status with client-side self-healing
  async getConfig(): Promise<ApiResponse<{ isGoogleScriptConnected: boolean; googleScriptUrl: string }>> {
    try {
      const response = await fetch('/api/settings/config', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.googleScriptUrl) {
        localStorage.setItem('google_script_url', data.data.googleScriptUrl);
      } else {
        // Self-heal stateless server if local storage has the URL but the server lost it (due to container scale-down/restart)
        const localUrl = localStorage.getItem('google_script_url');
        if (localUrl && (!data.data || !data.data.googleScriptUrl)) {
          console.log('[Self-Healing] Memulihkan GOOGLE_SCRIPT_URL dari local storage ke server...');
          this.saveConfig(localUrl);
          if (data.data) {
            data.data.isGoogleScriptConnected = true;
            data.data.googleScriptUrl = localUrl;
          }
        }
      }
      return data;
    } catch (error) {
      console.error('Fetch config error, falling back to local storage:', error);
      const localUrl = localStorage.getItem('google_script_url');
      if (localUrl) {
        return { success: true, data: { isGoogleScriptConnected: true, googleScriptUrl: localUrl } };
      }
      return { success: false, message: 'Gagal mengambil data konfigurasi.' };
    }
  },

  // Fetch full Code.gs script contents
  async getCodeGs(): Promise<ApiResponse<{ code: string }>> {
    try {
      const response = await fetch('/api/settings/code-gs', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch Code.gs error:', error);
      return { success: false, message: 'Gagal mengambil kode Google Apps Script.' };
    }
  },

  // Save config URL
  async saveConfig(googleScriptUrl: string): Promise<ApiResponse<any>> {
    const cleanUrl = (googleScriptUrl || '').trim();
    try {
      if (cleanUrl) {
        localStorage.setItem('google_script_url', cleanUrl);
      } else {
        localStorage.removeItem('google_script_url');
      }
      
      const response = await fetch('/api/settings/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ googleScriptUrl: cleanUrl })
      });
      
      const data = await response.json().catch(() => null);
      if (data) {
        return data;
      }
      return { 
        success: response.ok, 
        message: response.ok ? 'Konfigurasi berhasil disimpan.' : `Gagal menyimpan konfigurasi (Status: ${response.status})` 
      };
    } catch (error: any) {
      console.error('Save config error:', error);
      return { success: false, message: error?.message || 'Gagal menyimpan konfigurasi.' };
    }
  },

  // 3. Students (Siswa) APIs
  async getStudents(): Promise<ApiResponse<Siswa[]>> {
    try {
      const response = await fetch('/api/data?action=getStudents', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch students error:', error);
      return { success: false, message: 'Gagal mengambil data siswa.' };
    }
  },

  async addStudent(data: Omit<Siswa, 'id'> & { id?: string }): Promise<ApiResponse<Siswa[]>> {
    try {
      const response = await fetch('/api/data?action=addStudent', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add student error:', error);
      return { success: false, message: 'Gagal menyimpan data siswa.' };
    }
  },

  async deleteStudent(id: string): Promise<ApiResponse<Siswa[]>> {
    try {
      const response = await fetch('/api/data?action=deleteStudent', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete student error:', error);
      return { success: false, message: 'Gagal menghapus data siswa.' };
    }
  },

  // 4. Master Violations (Pelanggaran) APIs
  async getViolations(): Promise<ApiResponse<Pelanggaran[]>> {
    try {
      const response = await fetch('/api/data?action=getViolations', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch violations error:', error);
      return { success: false, message: 'Gagal mengambil data pelanggaran.' };
    }
  },

  async addViolation(data: Omit<Pelanggaran, 'id'> & { id?: string }): Promise<ApiResponse<Pelanggaran[]>> {
    try {
      const response = await fetch('/api/data?action=addViolation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add violation error:', error);
      return { success: false, message: 'Gagal menyimpan jenis pelanggaran.' };
    }
  },

  async deleteViolation(id: string): Promise<ApiResponse<Pelanggaran[]>> {
    try {
      const response = await fetch('/api/data?action=deleteViolation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete violation error:', error);
      return { success: false, message: 'Gagal menghapus jenis pelanggaran.' };
    }
  },

  // 5. Records (Pencatatan & Pembinaan) APIs
  async getRecords(): Promise<ApiResponse<{ pencatatan: Pencatatan[]; pembinaan: Pembinaan[] }>> {
    try {
      const response = await fetch('/api/data?action=getRecords', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch records error:', error);
      return { success: false, message: 'Gagal mengambil data riwayat pelanggaran.' };
    }
  },

  async addRecord(data: { nis: string; namaSiswa?: string; kelas?: string; pelanggaran: string; kode?: string; tanggal?: string; petugas: string; keterangan?: string; foto?: string; id?: string; poin?: number }): Promise<ApiResponse<{ pencatatan: Pencatatan[]; pembinaan: Pembinaan[] }>> {
    try {
      const response = await fetch('/api/data?action=addRecord', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add record error:', error);
      return { success: false, message: 'Gagal menyimpan pencatatan pelanggaran.' };
    }
  },

  async deleteRecord(id: string): Promise<ApiResponse<{ pencatatan: Pencatatan[]; pembinaan: Pembinaan[] }>> {
    try {
      const response = await fetch('/api/data?action=deleteRecord', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete record error:', error);
      return { success: false, message: 'Gagal menghapus pencatatan pelanggaran.' };
    }
  },

  // 6. Attendance (Rekap Kehadiran) APIs
  async getKehadiran(): Promise<ApiResponse<KehadiranData[]>> {
    try {
      const response = await fetch('/api/data?action=getKehadiran', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch kehadiran error:', error);
      return { success: false, message: 'Gagal mengambil data rekap kehadiran.' };
    }
  },

  async addKehadiran(data: Partial<KehadiranData> & { nis: string; mingguKe: string; bulan: string; tahun: string }): Promise<ApiResponse<KehadiranData[]>> {
    try {
      const response = await fetch('/api/data?action=addKehadiran', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add kehadiran error:', error);
      return { success: false, message: 'Gagal menyimpan rekap kehadiran.' };
    }
  },

  async deleteKehadiran(id: string): Promise<ApiResponse<KehadiranData[]>> {
    try {
      const response = await fetch('/api/data?action=deleteKehadiran', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete kehadiran error:', error);
      return { success: false, message: 'Gagal menghapus rekap kehadiran.' };
    }
  },

  // 7. Layanan BK APIs (Konseling, Asesmen, Kunjungan Rumah, SNBP)
  async getKonseling(): Promise<ApiResponse<KonselingData[]>> {
    try {
      const response = await fetch('/api/data?action=getKonseling', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch konseling error:', error);
      return { success: false, message: 'Gagal mengambil data konseling.' };
    }
  },

  async addKonseling(data: Partial<KonselingData> & { nis: string; namaSiswa: string; kelas: string }): Promise<ApiResponse<KonselingData[]>> {
    try {
      const response = await fetch('/api/data?action=addKonseling', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add konseling error:', error);
      return { success: false, message: 'Gagal menyimpan data konseling.' };
    }
  },

  async deleteKonseling(id: string): Promise<ApiResponse<KonselingData[]>> {
    try {
      const response = await fetch('/api/data?action=deleteKonseling', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete konseling error:', error);
      return { success: false, message: 'Gagal menghapus data konseling.' };
    }
  },

  async getAsesmen(): Promise<ApiResponse<AsesmenData[]>> {
    try {
      const response = await fetch('/api/data?action=getAsesmen', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch asesmen error:', error);
      return { success: false, message: 'Gagal mengambil data asesmen.' };
    }
  },

  async addAsesmen(data: Partial<AsesmenData> & { nis: string; namaSiswa: string; kelas: string }): Promise<ApiResponse<AsesmenData[]>> {
    try {
      const response = await fetch('/api/data?action=addAsesmen', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add asesmen error:', error);
      return { success: false, message: 'Gagal menyimpan data asesmen.' };
    }
  },

  async deleteAsesmen(id: string): Promise<ApiResponse<AsesmenData[]>> {
    try {
      const response = await fetch('/api/data?action=deleteAsesmen', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete asesmen error:', error);
      return { success: false, message: 'Gagal menghapus data asesmen.' };
    }
  },

  async getKunjungan(): Promise<ApiResponse<KunjunganRumahData[]>> {
    try {
      const response = await fetch('/api/data?action=getKunjungan', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch kunjungan error:', error);
      return { success: false, message: 'Gagal mengambil data kunjungan rumah.' };
    }
  },

  async addKunjungan(data: Partial<KunjunganRumahData> & { nis: string; namaSiswa: string; kelas: string }): Promise<ApiResponse<KunjunganRumahData[]>> {
    try {
      const response = await fetch('/api/data?action=addKunjungan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add kunjungan error:', error);
      return { success: false, message: 'Gagal menyimpan data kunjungan rumah.' };
    }
  },

  async deleteKunjungan(id: string): Promise<ApiResponse<KunjunganRumahData[]>> {
    try {
      const response = await fetch('/api/data?action=deleteKunjungan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete kunjungan error:', error);
      return { success: false, message: 'Gagal menghapus data kunjungan rumah.' };
    }
  },

  async getSnbp(): Promise<ApiResponse<SnbpData[]>> {
    try {
      const response = await fetch('/api/data?action=getSnbp', {
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Fetch SNBP error:', error);
      return { success: false, message: 'Gagal mengambil data SNBP.' };
    }
  },

  async addSnbp(data: Partial<SnbpData> & { nis: string; namaSiswa: string; kelas: string }): Promise<ApiResponse<SnbpData[]>> {
    try {
      const response = await fetch('/api/data?action=addSnbp', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error('Add SNBP error:', error);
      return { success: false, message: 'Gagal menyimpan data SNBP.' };
    }
  },

  async deleteSnbp(id: string): Promise<ApiResponse<SnbpData[]>> {
    try {
      const response = await fetch('/api/data?action=deleteSnbp', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      return await response.json();
    } catch (error) {
      console.error('Delete SNBP error:', error);
      return { success: false, message: 'Gagal menghapus data SNBP.' };
    }
  },

  // 8. Action Plan & Target Pembinaan APIs
  async getActionPlans(): Promise<ApiResponse<ActionPlan[]>> {
    try {
      const response = await fetch('/api/data?action=getActionPlans', {
        headers: getAuthHeaders()
      });
      const res = await response.json();
      if (res.success && Array.isArray(res.data)) {
        localStorage.setItem('local_action_plans', JSON.stringify(res.data));
        return res;
      }
    } catch (error) {
      console.warn('Fetch action plans error, reading from local fallback:', error);
    }
    const local = localStorage.getItem('local_action_plans');
    const plans: ActionPlan[] = local ? JSON.parse(local) : [];
    return { success: true, data: plans };
  },

  async addActionPlan(data: Partial<ActionPlan>): Promise<ApiResponse<ActionPlan[]>> {
    try {
      const response = await fetch('/api/data?action=addActionPlan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const res = await response.json();
      if (res.success && Array.isArray(res.data)) {
        localStorage.setItem('local_action_plans', JSON.stringify(res.data));
        return res;
      }
    } catch (error) {
      console.warn('Add action plan server error, falling back locally:', error);
    }
    // Local fallback update
    const local = localStorage.getItem('local_action_plans');
    const plans: ActionPlan[] = local ? JSON.parse(local) : [];
    const newPlan: ActionPlan = {
      id: data.id || 'AP_' + Date.now(),
      nis: data.nis || '',
      namaSiswa: data.namaSiswa || '',
      kelas: data.kelas || '',
      judulTarget: data.judulTarget || 'Target Pembinaan',
      kategoriTarget: data.kategoriTarget || 'Kedisiplinan',
      deskripsiRencana: data.deskripsiRencana || '',
      indikatorKeberhasilan: data.indikatorKeberhasilan || '',
      tenggatWaktu: data.tenggatWaktu || '',
      tanggalDibuat: data.tanggalDibuat || new Date().toISOString().split('T')[0],
      status: data.status || 'Direncanakan',
      poinTargetPengurangan: data.poinTargetPengurangan || 0,
      pembimbing: data.pembimbing || 'Guru BK',
      catatanEvaluasi: data.catatanEvaluasi || ''
    };
    const updated = [newPlan, ...plans];
    localStorage.setItem('local_action_plans', JSON.stringify(updated));
    return { success: true, message: 'Action plan berhasil disimpan (Offline/Lokal).', data: updated };
  },

  async updateActionPlan(id: string, updates: Partial<ActionPlan>): Promise<ApiResponse<ActionPlan[]>> {
    try {
      const response = await fetch('/api/data?action=updateActionPlan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, ...updates })
      });
      const res = await response.json();
      if (res.success && Array.isArray(res.data)) {
        localStorage.setItem('local_action_plans', JSON.stringify(res.data));
        return res;
      }
    } catch (error) {
      console.warn('Update action plan server error, falling back locally:', error);
    }
    const local = localStorage.getItem('local_action_plans');
    const plans: ActionPlan[] = local ? JSON.parse(local) : [];
    const updated = plans.map(p => p.id === id ? { ...p, ...updates, tanggalEvaluasiTerakhir: new Date().toISOString().split('T')[0] } : p);
    localStorage.setItem('local_action_plans', JSON.stringify(updated));
    return { success: true, message: 'Action plan berhasil diperbarui.', data: updated };
  },

  async deleteActionPlan(id: string): Promise<ApiResponse<ActionPlan[]>> {
    try {
      const response = await fetch('/api/data?action=deleteActionPlan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id })
      });
      const res = await response.json();
      if (res.success && Array.isArray(res.data)) {
        localStorage.setItem('local_action_plans', JSON.stringify(res.data));
        return res;
      }
    } catch (error) {
      console.warn('Delete action plan server error, falling back locally:', error);
    }
    const local = localStorage.getItem('local_action_plans');
    const plans: ActionPlan[] = local ? JSON.parse(local) : [];
    const updated = plans.filter(p => p.id !== id);
    localStorage.setItem('local_action_plans', JSON.stringify(updated));
    return { success: true, message: 'Action plan berhasil dihapus.', data: updated };
  },

  // 9. Data Synchronization APIs
  async syncPull(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/data?action=syncPull', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Sync pull error:', error);
      return { success: false, message: 'Gagal menarik data dari Google Sheet.' };
    }
  },

  async syncPush(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/data?action=syncPush', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Sync push error:', error);
      return { success: false, message: 'Gagal mengirim data ke Google Sheet.' };
    }
  },

  async syncMerge(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('/api/data?action=syncMerge', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Sync merge error:', error);
      return { success: false, message: error?.message || 'Gagal mensinkronisasikan data dua arah.' };
    }
  }
};
