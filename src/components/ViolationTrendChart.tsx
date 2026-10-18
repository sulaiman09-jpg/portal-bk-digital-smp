import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Pencatatan, Pelanggaran } from '../types';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  AlertTriangle,
  Award,
  Activity
} from 'lucide-react';

interface ViolationTrendChartProps {
  pencatatan: Pencatatan[];
  pelanggaran: Pelanggaran[];
  className?: string;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to parse diverse date formats into { year, month (0-11), day }
const parseRecordDate = (dateVal: any): { year: number; month: number; day: number } | null => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();

  // Try standard Date parsing for ISO timestamps or full strings e.g., "Wed Sep 30 2026..."
  if (str.length > 15 || str.includes('GMT') || str.includes('T') || isNaN(Number(str.substring(0, 4)))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    }
  }

  // Format DD/MM/YYYY or YYYY/MM/DD
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) return { year: y, month: m, day: d };
      } else {
        const y = Number(parts[2]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[0]);
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) return { year: y, month: m, day: d };
      }
    }
  }

  // Format YYYY-MM-DD or DD-MM-YYYY
  if (str.includes('-')) {
    const cleanStr = str.split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) return { year: y, month: m, day: d };
      } else {
        const y = Number(parts[2]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[0]);
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) return { year: y, month: m, day: d };
      }
    }
  }

  return null;
};

export default function ViolationTrendChart({ pencatatan, pelanggaran, className = '' }: ViolationTrendChartProps) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  // 1. Determine available years from records
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(currentYear);

    pencatatan.forEach(rec => {
      const parsed = parseRecordDate(rec.tanggal);
      if (parsed && parsed.year > 2000 && parsed.year < 2100) {
        yearSet.add(parsed.year);
      }
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [pencatatan, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears.length > 0 ? availableYears[0] : currentYear;
  });

  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');
  const [metricType, setMetricType] = useState<'kasus' | 'poin'>('kasus');

  // 2. Build map of violation categories
  const violationCategoryMap = useMemo(() => {
    const map = new Map<string, 'Ringan' | 'Sedang' | 'Berat'>();
    pelanggaran.forEach(v => {
      if (v.namaPelanggaran) {
        map.set(v.namaPelanggaran.toLowerCase().trim(), v.kategori);
      }
    });
    return map;
  }, [pelanggaran]);

  // 3. Aggregate data per month for the selected year
  const monthlyData = useMemo(() => {
    const initial = MONTH_NAMES_SHORT.map((shortName, idx) => ({
      month: shortName,
      monthIndex: idx,
      fullName: MONTH_NAMES_FULL[idx],
      kasus: 0,
      poin: 0,
      ringan: 0,
      sedang: 0,
      berat: 0
    }));

    pencatatan.forEach(rec => {
      const parsed = parseRecordDate(rec.tanggal);
      if (parsed && parsed.year === selectedYear) {
        const mIdx = parsed.month;
        if (mIdx >= 0 && mIdx < 12) {
          const entry = initial[mIdx];
          entry.kasus += 1;
          entry.poin += rec.poin || 0;

          // Determine category
          let cat: 'Ringan' | 'Sedang' | 'Berat' = 'Ringan';
          const recName = rec.pelanggaran ? rec.pelanggaran.toLowerCase().trim() : '';
          if (violationCategoryMap.has(recName)) {
            cat = violationCategoryMap.get(recName)!;
          } else {
            if (rec.poin >= 50) cat = 'Berat';
            else if (rec.poin >= 15) cat = 'Sedang';
            else cat = 'Ringan';
          }

          if (cat === 'Ringan') entry.ringan += 1;
          else if (cat === 'Sedang') entry.sedang += 1;
          else if (cat === 'Berat') entry.berat += 1;
        }
      }
    });

    return initial;
  }, [pencatatan, selectedYear, violationCategoryMap]);

  // 4. Summary metrics for BK Counselors
  const metrics = useMemo(() => {
    const totalCases = monthlyData.reduce((acc, curr) => acc + curr.kasus, 0);
    const totalPoints = monthlyData.reduce((acc, curr) => acc + curr.poin, 0);

    // Peak month
    let peakMonth = monthlyData[0];
    monthlyData.forEach(m => {
      if (m.kasus > peakMonth.kasus) {
        peakMonth = m;
      }
    });

    // Average cases per active month
    const monthsWithCases = monthlyData.filter(m => m.kasus > 0).length || 1;
    const avgCases = (totalCases / (selectedYear === currentYear ? Math.max(currentMonthIdx + 1, 1) : 12)).toFixed(1);

    // Month-over-month trend for current year
    let momChange = 0;
    let momDirection: 'up' | 'down' | 'neutral' = 'neutral';
    if (currentMonthIdx > 0 && selectedYear === currentYear) {
      const thisMonth = monthlyData[currentMonthIdx]?.kasus || 0;
      const lastMonth = monthlyData[currentMonthIdx - 1]?.kasus || 0;
      momChange = thisMonth - lastMonth;
      if (momChange > 0) momDirection = 'up';
      else if (momChange < 0) momDirection = 'down';
    }

    return {
      totalCases,
      totalPoints,
      peakMonth,
      avgCases,
      momChange,
      momDirection
    };
  }, [monthlyData, selectedYear, currentYear, currentMonthIdx]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[200px] z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-blue-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {data.fullName} {selectedYear}
            </span>
            <span className="bg-blue-600/40 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {data.kasus} Kasus
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Pelanggaran Ringan:
              </span>
              <span className="font-bold text-white font-mono">{data.ringan}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Pelanggaran Sedang:
              </span>
              <span className="font-bold text-white font-mono">{data.sedang}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Pelanggaran Berat:
              </span>
              <span className="font-bold text-white font-mono">{data.berat}</span>
            </div>

            <div className="pt-2 mt-2 border-t border-slate-800/80 flex justify-between items-center font-semibold">
              <span className="text-slate-400 text-[11px]">Akumulasi Poin:</span>
              <span className="text-amber-400 font-mono text-xs">+{data.poin} Poin</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Tren Intensitas Pelanggaran Bulanan</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisasi fluktuasi kasus dan tingkat keparahan siswa per bulan untuk analisis Guru BK
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>Tahun {year}</option>
              ))}
            </select>
          </div>

          {/* Metric Toggle: Kasus vs Poin */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setMetricType('kasus')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricType === 'kasus'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kasus
            </button>
            <button
              onClick={() => setMetricType('poin')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                metricType === 'poin'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Poin
            </button>
          </div>

          {/* Chart Mode Toggle: Area vs Bar */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setChartMode('area')}
              title="Grafik Tren Garis & Area"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartMode('bar')}
              title="Diagram Batang Kategori"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Insight Mini Badges for BK */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-500 block">Total Pelanggaran</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-slate-900">{metrics.totalCases}</span>
            <span className="text-[11px] text-slate-500">kasus</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-500 block">Akumulasi Poin</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-amber-600">+{metrics.totalPoints}</span>
            <span className="text-[11px] text-slate-500">poin</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-500 block">Bulan Paling Intens</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-bold text-slate-800 truncate">
              {metrics.peakMonth.kasus > 0 ? metrics.peakMonth.fullName : '-'}
            </span>
            {metrics.peakMonth.kasus > 0 && (
              <span className="text-[11px] font-mono font-semibold text-rose-600">
                ({metrics.peakMonth.kasus})
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-500 block">Rata-rata Bulanan</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-bold font-mono text-slate-900">{metrics.avgCases}</span>
            <span className="text-[11px] text-slate-500">kasus/bln</span>
          </div>
        </div>
      </div>

      {/* Recharts Visualization Container */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'area' ? (
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorKasus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPoin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={metricType === 'kasus' ? 'kasus' : 'poin'}
                name={metricType === 'kasus' ? 'Jumlah Kasus' : 'Akumulasi Poin'}
                stroke={metricType === 'kasus' ? '#2563eb' : '#d97706'}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={metricType === 'kasus' ? 'url(#colorKasus)' : 'url(#colorPoin)'}
                dot={{ r: 3.5, fill: metricType === 'kasus' ? '#2563eb' : '#d97706', strokeWidth: 1.5, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: metricType === 'kasus' ? '#1d4ed8' : '#b45309' }}
              />
            </AreaChart>
          ) : (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}
              />
              <Bar
                dataKey="ringan"
                name="Ringan"
                stackId="a"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="sedang"
                name="Sedang"
                stackId="a"
                fill="#f59e0b"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="berat"
                name="Berat"
                stackId="a"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Notes for BK */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ringan (1-14 Poin)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sedang (15-49 Poin)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Berat (≥50 Poin)
          </span>
        </div>
        <span className="text-slate-400 font-mono">
          Data tersinkronisasi otomatis
        </span>
      </div>
    </div>
  );
}
