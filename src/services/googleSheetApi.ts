import { Siswa, Pelanggaran, Pencatatan, Pembinaan, AuthResponse, ApiResponse } from '../types';

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
    try {
      if (googleScriptUrl) {
        localStorage.setItem('google_script_url', googleScriptUrl);
      } else {
        localStorage.removeItem('google_script_url');
      }
      
      const response = await fetch('/api/settings/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ googleScriptUrl })
      });
      return await response.json();
    } catch (error) {
      console.error('Save config error:', error);
      return { success: false, message: 'Gagal menyimpan konfigurasi.' };
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

  async addRecord(data: { nis: string; pelanggaran: string; tanggal?: string; petugas: string; keterangan?: string; foto?: string; id?: string; poin?: number }): Promise<ApiResponse<{ pencatatan: Pencatatan[]; pembinaan: Pembinaan[] }>> {
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

  // 6. Data Synchronization APIs
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
      return await response.json();
    } catch (error) {
      console.error('Sync merge error:', error);
      return { success: false, message: 'Gagal mensinkronisasikan data dua arah.' };
    }
  }
};
