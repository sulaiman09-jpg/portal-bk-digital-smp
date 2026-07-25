export const belongsToSchool = (studentKelas: string, schoolFilter: string): boolean => {
  if (!studentKelas) return false;
  const k = studentKelas.toUpperCase().trim();
  const sf = schoolFilter.toUpperCase().trim();
  
  if (k === sf) return true;
  
  if (sf === 'SMP NUSANTARA PLUS') {
    if (k.includes('SMP')) return true;
    const isSmpGrade = /^(7|8|9|VII|VIII|IX)(?![0-9])/i.test(k);
    if (isSmpGrade && !k.includes('SMA') && !k.includes('SMK')) return true;
    const defaultSmpClasses = ['7-A', '7-B', '7-C', '8-A', '8-B', '9-A', '9-B', '7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7'];
    if (defaultSmpClasses.some(c => k.includes(c) || k.replace(/[- .]/g, '').includes(c.replace(/[- .]/g, '')))) return true;
  }
  
  if (sf === 'SMA NUSANTARA PLUS') {
    if (k.includes('SMA') || k.includes('IPA') || k.includes('IPS') || k.includes('MIPA')) {
      if (!k.includes('SMK')) return true;
    }
    const isSmaGrade = /^(10|11|12|X|XI|XII)(?![A-Z]*\b(SMK|SMP|KESEHATAN|TKJ|RPL|FARMASI|KEPERAWATAN|FAR|PERAWAT))/i.test(k);
    if (isSmaGrade && !k.includes('SMP') && !k.includes('SMK') && !k.includes('KESEHATAN') && !k.includes('TKJ') && !k.includes('RPL') && !k.includes('FARMASI') && !k.includes('LPK')) return true;
  }
  
  if (sf === 'SMK NUSANTARA 1') {
    if (k.includes('SMK 1') || k.includes('SMK NUSANTARA 1')) return true;
    const isSmkMajor = k.includes('TKJ') || k.includes('RPL') || k.includes('MM') || k.includes('OTKP') || k.includes('AKL') || k.includes('BDP');
    if (isSmkMajor && !k.includes('KESEHATAN') && !k.includes('SMK 2')) return true;
    if (k.includes('SMK') && !k.includes('SMK 2') && !k.includes('KESEHATAN') && !k.includes('FAR') && !k.includes('LK') && !k.includes('TLM') && !k.includes('LPK')) return true;
  }
  
  if (sf === 'SMK 2 KESEHATAN') {
    if (k.includes('SMK 2') || k.includes('KESEHATAN') || k.includes('FARMASI') || k.includes('KEPERAWATAN') || k.includes('FAR') || k.includes('PERAWAT') || k.includes('TLM') || k.includes('LK') || k.includes('LPKC') || k.includes('LPK3') || k.includes('LPLM')) return true;
  }
  
  return false;
};
