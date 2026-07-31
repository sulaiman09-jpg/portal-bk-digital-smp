import React from 'react';
import { motion } from 'motion/react';
import { Siswa } from '../types';
import { belongsToSchool } from '../utils/schoolUtils';
import { Users, User, UserCheck, Sparkles, School, GraduationCap } from 'lucide-react';

interface GenderDemographicsCardProps {
  siswa: Siswa[];
  schoolFilter?: string;
  showSchoolGrid?: boolean;
  title?: string;
}

export function calculateGenderStats(siswaList: Siswa[]) {
  let laki = 0;
  let perempuan = 0;

  siswaList.forEach(s => {
    const jkVal = String(s.jk || '').trim().toUpperCase();
    if (jkVal.startsWith('P') || jkVal === 'PEREMPUAN') {
      perempuan++;
    } else {
      laki++;
    }
  });

  const total = siswaList.length;
  const pctLaki = total > 0 ? Math.round((laki / total) * 1000) / 10 : 0;
  const pctPerempuan = total > 0 ? Math.round((perempuan / total) * 1000) / 10 : 0;

  return {
    total,
    laki,
    perempuan,
    pctLaki,
    pctPerempuan
  };
}

export const SCHOOL_UNITS = [
  { id: 'smp', name: 'SMP NUSANTARA PLUS', shortName: 'SMP Nusantara Plus', color: 'from-blue-600 to-cyan-600', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'sma', name: 'SMA NUSANTARA PLUS', shortName: 'SMA Nusantara Plus', color: 'from-indigo-600 to-purple-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'smk1', name: 'SMK NUSANTARA 1', shortName: 'SMK Nusantara 1', color: 'from-emerald-600 to-teal-600', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'smk2', name: 'SMK 2 KESEHATAN', shortName: 'SMK 2 Kesehatan Nusantara', color: 'from-rose-600 to-amber-600', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export default function GenderDemographicsCard({
  siswa,
  schoolFilter,
  showSchoolGrid = false,
  title
}: GenderDemographicsCardProps) {
  // Filter students if a specific school or class filter is provided
  const targetStudents = schoolFilter
    ? siswa.filter(s => s.kelas === schoolFilter || belongsToSchool(s.kelas, schoolFilter))
    : siswa;

  const overallStats = calculateGenderStats(targetStudents);

  return (
    <div className="space-y-6">
      {/* Primary Overview Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {title || (schoolFilter ? `Statistik Gender Siswa - ${schoolFilter}` : 'Statistik Demografi & Gender Total Siswa')}
                </h3>
                <p className="text-xs text-slate-500">
                  Rekapitulasi rasio jumlah siswa Laki-Laki (L) dan Perempuan (P)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-black font-mono rounded-xl border border-slate-200">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Total: {overallStats.total.toLocaleString('id-ID')} Siswa
            </span>
          </div>
        </div>

        {/* Gender KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Total Siswa */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Keseluruhan</span>
              <span className="p-2 bg-blue-100/80 text-blue-700 rounded-xl">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono block">
                {overallStats.total.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">100% Seluruh Siswa Terdaftar</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
              <div className="bg-blue-600 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Card Laki-laki */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Laki-Laki (L)
              </span>
              <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <User className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-950 font-mono">
                  {overallStats.laki.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-extrabold text-blue-700 bg-blue-200/80 px-2 py-0.5 rounded-md font-mono">
                  {overallStats.pctLaki}%
                </span>
              </div>
              <span className="text-[11px] text-blue-700/80 font-medium">Siswa Berjenis Kelamin Laki-Laki</span>
            </div>
            <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallStats.pctLaki}%` }}
                transition={{ duration: 0.6 }}
                className="bg-blue-600 h-full rounded-full"
              />
            </div>
          </div>

          {/* Card Perempuan */}
          <div className="bg-pink-50/60 border border-pink-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-800 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" /> Perempuan (P)
              </span>
              <span className="p-2 bg-pink-500 text-white rounded-xl shadow-xs">
                <User className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-pink-950 font-mono">
                  {overallStats.perempuan.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-extrabold text-pink-700 bg-pink-200/80 px-2 py-0.5 rounded-md font-mono">
                  {overallStats.pctPerempuan}%
                </span>
              </div>
              <span className="text-[11px] text-pink-700/80 font-medium">Siswa Berjenis Kelamin Perempuan</span>
            </div>
            <div className="w-full bg-pink-200/60 h-2.5 rounded-full overflow-hidden mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallStats.pctPerempuan}%` }}
                transition={{ duration: 0.6 }}
                className="bg-pink-500 h-full rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Visual Dual-Ratio Bar Chart */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span className="text-blue-700 flex items-center gap-1.5 font-mono">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Laki-Laki: {overallStats.laki.toLocaleString('id-ID')} ({overallStats.pctLaki}%)
            </span>
            <span className="text-pink-700 flex items-center gap-1.5 font-mono">
              Perempuan: {overallStats.perempuan.toLocaleString('id-ID')} ({overallStats.pctPerempuan}%)
              <User className="w-3.5 h-3.5 text-pink-500" />
            </span>
          </div>

          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallStats.pctLaki}%` }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-blue-700 to-blue-500 h-full text-[9px] text-white font-bold flex items-center justify-center font-mono"
            >
              {overallStats.pctLaki >= 15 && `${overallStats.pctLaki}%`}
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallStats.pctPerempuan}%` }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-pink-500 to-rose-600 h-full text-[9px] text-white font-bold flex items-center justify-center font-mono"
            >
              {overallStats.pctPerempuan >= 15 && `${overallStats.pctPerempuan}%`}
            </motion.div>
          </div>
        </div>
      </div>

      {/* School Units Grid Breakdown (Displayed when showSchoolGrid is true on Main Portal) */}
      {showSchoolGrid && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600" />
              Rincian Gender Per Unit Sekolah (SMP, SMA, SMK 1, SMK 2)
            </h3>
            <span className="text-xs text-slate-500 font-medium">4 Unit Sekolah Terintegrasi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {SCHOOL_UNITS.map(unit => {
              const unitStudents = siswa.filter(s => belongsToSchool(s.kelas, unit.name));
              const stats = calculateGenderStats(unitStudents);

              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${unit.badgeBg}`}>
                        {unit.shortName}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {stats.total} Siswa
                      </span>
                    </div>

                    <div className="pt-2 flex items-baseline justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs text-slate-500 font-medium">Total Terdaftar</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {stats.total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Laki vs Perempuan Stats Bars */}
                  <div className="space-y-3 pt-1">
                    {/* Laki-laki row */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-blue-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600" /> Laki-Laki
                        </span>
                        <span className="text-slate-800 font-mono font-bold">
                          {stats.laki} <span className="text-[10px] text-blue-600">({stats.pctLaki}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${stats.pctLaki}%` }}
                        />
                      </div>
                    </div>

                    {/* Perempuan row */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-pink-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-pink-500" /> Perempuan
                        </span>
                        <span className="text-slate-800 font-mono font-bold">
                          {stats.perempuan} <span className="text-[10px] text-pink-600">({stats.pctPerempuan}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-pink-500 h-full rounded-full"
                          style={{ width: `${stats.pctPerempuan}%` }}
                        />
                      </div>
                    </div>

                    {/* Stacked Ratio Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex mt-2">
                      <div
                        className="bg-blue-600 h-full"
                        style={{ width: `${stats.pctLaki}%` }}
                      />
                      <div
                        className="bg-pink-500 h-full"
                        style={{ width: `${stats.pctPerempuan}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
