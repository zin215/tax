// src/components/Simulator.js
import React, { useState, useMemo } from 'react';
import { calculateTax, checkTaxThreshold } from '../engine/taxEngine';

const fmt = (num) => new Intl.NumberFormat("ko-KR").format(Math.round(Number(num) || 0));

const CashFlowSimulator = ({
  data = [],
  onRefresh = () => {},
  targetMonthly,
  setTargetMonthly,
  monthlyAddition,
  setMonthlyAddition,
}) => {
    // ⚙️ 제어 컨트롤 패널 상태
    const [priceGrowthRate, setPriceGrowthRate] = useState(3);
    const [beforeGoalReinvestRate, setBeforeGoalReinvestRate] = useState(70);
    const [afterGoalReinvestRate, setAfterGoalReinvestRate] = useState(30);

    const [simYears, setInvestYears] = useState(25);
    const [isStressMode, setIsStressMode] = useState(false);
    const [selectedCycleFilter, setSelectedCycleFilter] = useState('ALL');
    const [inflationRate, setInflationRate] = useState(2.0);
    const [dividendGrowthRate, setDividendGrowthRate] = useState(5.0);

    // 1. 데이터 평탄화 (6대 계좌 합치기)
    const flatData = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    if (typeof data === "object") {
        return Object.values(data)
            .filter(Array.isArray)
            .flat();
    }

    return [];
}, [data]);

    // 2. 통합 엔진 (데이터 계산 + 복리 타임라인 + 요약 stats)
    const { simTimeline, stats } = useMemo(() => {
    const safeFlatData = Array.isArray(flatData) ? flatData : [];

    if (safeFlatData.length === 0) {
        return { simTimeline: [], stats: null };
    }

        // 🔥 [핵심 추가] 콤마(,)를 제거하고 안전하게 숫자로 바꿔주는 클리너 함수
        const safeNum = (val) => Number(String(val || '0').replace(/,/g, '')) || 0;

        const processedAssets = safeFlatData.map(item => ({
            account: String(item.account || item.계좌명 || '일반계좌').trim(),
            category: String(item.category || item.카테고리 || ''),
            name: String(item.name || item.종목명 || '미지정 자산'),
            quantity: safeNum(item.수량 || item.quantity), // 클리너 적용
            currentPrice: safeNum(item.현재가 || item.currentPrice), // 클리너 적용
            divCycle: String(item.divCycle || item.배당주기 || '월말').trim(),
            // 클리너 적용 후 연간 배당금으로 치환
            annualDps: (safeNum(item.주당배당금 || item.dps) * (String(item.divCycle || '').includes('분기') ? 4 : String(item.divCycle || '').includes('반기') ? 2 : 12)),
            taxableRatio: item.taxableRatio !== undefined ? safeNum(item.taxableRatio) : 1
        }));

        let currentAssets = processedAssets.map(a => ({ ...a, value: a.quantity * a.currentPrice }));
        const timeline = [];
        const monthsCount = simYears * 12;
        let annualGeneralDividendAccum = 0;
        let annualPensionWithdrawalAccum = 0;

        for (let m = 1; m <= monthsCount; m++) {
            const isYearEnd = (m % 12 === 0);
            const inflationFactor = Math.pow(1 + (inflationRate / 100), (m - 1) / 12);
            const divGrowthFactor = Math.pow(1 + (dividendGrowthRate / 100), (m - 1) / 12);
            
            let monthlyGrossMid = 0;
            let monthlyGrossEnd = 0;
            let monthlyTax = 0;
            let totalValue = 0;
            const crashFactor = isStressMode ? 0.70 : 1.0;

            currentAssets.forEach((asset) => {
  const priceGrowthFactor = Math.pow(
    1 + priceGrowthRate / 100,
    (m - 1) / 12
  );

  const adjustedPrice = asset.currentPrice * priceGrowthFactor;

  asset.adjustedPrice = adjustedPrice;
  asset.value = asset.quantity * adjustedPrice;

  totalValue += asset.value;

  const currentGross =
    (asset.quantity * (asset.annualDps * divGrowthFactor) / 12) * crashFactor;

  if (currentGross <= 0) return;

  if (asset.divCycle.includes("15일") || asset.divCycle.includes("월중")) {
    monthlyGrossMid += currentGross;
  } else {
    monthlyGrossEnd += currentGross;
  }

  const taxInfo = calculateTax(
    currentGross,
    asset.account,
    asset.category,
    asset.taxableRatio
  );

  monthlyTax += taxInfo.taxAmount;

  if (["연금", "IRP"].some((t) => asset.account.includes(t))) {
    annualPensionWithdrawalAccum += currentGross;
  } else {
    annualGeneralDividendAccum += currentGross * asset.taxableRatio;
  }
});

            if (isYearEnd) {
                const taxCheck = checkTaxThreshold(annualGeneralDividendAccum);
                if (taxCheck.isOverLimit) monthlyTax += taxCheck.overAmount * 0.1; // 간이세율
                annualGeneralDividendAccum = 0;
                annualPensionWithdrawalAccum = 0;
            }

            const totalGross = monthlyGrossMid + monthlyGrossEnd;
const netCash = totalGross - monthlyTax;
const targetNeeded = targetMonthly * inflationFactor;

const isGoalReached = netCash >= targetNeeded;

// 목표 달성 전 70%, 달성 후 30%
const dividendReinvestRate = isGoalReached
  ? afterGoalReinvestRate / 100
  : beforeGoalReinvestRate / 100;

           timeline.push({
  month: m,
  grossMid: monthlyGrossMid,
  grossEnd: monthlyGrossEnd,
  totalGross,
  monthlyTax,
  netCash,
  totalValue,
  targetNeeded,
  reinvestRate: dividendReinvestRate * 100,
});

            // 재투자

const totalInvestableCash =
  monthlyAddition + netCash * dividendReinvestRate;

if (totalInvestableCash > 0 && currentAssets.length > 0) {
  const reinvest = totalInvestableCash / currentAssets.length;

  currentAssets.forEach((a) => {
    const buyPrice = a.adjustedPrice || a.currentPrice;

    if (buyPrice > 0) {
      a.quantity += reinvest / buyPrice;
      a.value = a.quantity * buyPrice;
    }
  });
}
        }

        const last = timeline[timeline.length - 1];
        const matchIndex = timeline.findIndex(d => d.netCash >= d.targetNeeded);

        return {
            simTimeline: timeline,
            stats: {
                currentNet: timeline[0].netCash,
                finalNet: last.netCash,
                finalValue: last.totalValue,
                matchMonth: matchIndex !== -1 ? matchIndex + 1 : -1
            }
        };
    }, [
  flatData,
  simYears,
  targetMonthly,
  monthlyAddition,
  inflationRate,
  dividendGrowthRate,
  priceGrowthRate,
  beforeGoalReinvestRate,
  afterGoalReinvestRate,
  isStressMode
]);

    if (!stats) return <div className="p-10 text-center text-slate-500 bg-slate-900 rounded-2xl">데이터를 불러오는 중입니다...</div>;

    return (
        <div className="p-6 space-y-6 text-slate-300 bg-slate-950 rounded-2xl border border-slate-900 shadow-2xl">
            {/* 1구역: 핵심 예측 보드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-inner">
                    <div className="text-xs text-slate-400 mb-1">현재 월 세후 배당 소득</div>
                    <div className="text-xl font-bold text-white">{fmt(stats.currentNet)}원</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-inner">
                    <div className="text-xs text-slate-400 mb-1">{simYears}년 후 장기 복리 월 소득</div>
                    <div className="text-xl font-bold text-emerald-400">{fmt(stats.finalNet)}원</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-inner">
                    <div className="text-xs text-slate-400 mb-1">복리 극대화 최종 자산규모</div>
                    <div className="text-xl font-bold text-brand-400">₩{fmt(stats.finalValue)}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-inner">
                    <div className="text-xs text-slate-400 mb-1">목표 생활비 달성(은퇴) 시점</div>
                    <div className="text-xl font-bold text-amber-500">
                        {stats.matchMonth !== -1 ? `${Math.floor(stats.matchMonth / 12)}년 ${stats.matchMonth % 12}개월 후` : '도달 불가 (투자금 증대 필요)'}
                    </div>
                </div>
            </div>

            {/* 2구역: 제어 컨트롤 패널 */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-xl">
                {/* 패널 1: 투자 금액 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">🎯 목표 및 적립 설정</h3>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">매월 추가 적립 투자금</label>
                        <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                            <input type="number" value={monthlyAddition} onChange={(e) => setMonthlyAddition(Number(e.target.value))} className="w-full bg-transparent text-right text-brand-400 font-bold focus:outline-none" />
                            <span className="text-xs text-slate-500 ml-2">원</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">은퇴 후 목표 생활비 (현재가치)</label>
                        <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                            <input type="number" value={targetMonthly} onChange={(e) => setTargetMonthly(Number(e.target.value))} className="w-full bg-transparent text-right text-white font-bold focus:outline-none" />
                            <span className="text-xs text-slate-500 ml-2">원</span>
                        </div>
                    </div>
                </div>

                {/* 패널 2: 거시 경제 변수 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white">📈 배당 및 물가 성장률</h3>
                    <div>
                        <label className="block text-xs text-emerald-400 mb-1.5 font-semibold">예상 연 배당 성장률</label>
                        <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                            <input type="number" step="0.1" value={dividendGrowthRate} onChange={(e) => setDividendGrowthRate(Number(e.target.value))} className="w-full bg-transparent text-right text-emerald-400 font-bold focus:outline-none" />
                            <span className="text-xs text-slate-500 ml-2">%</span>
                        </div>
                    </div>
<div>
  <label className="block text-xs text-sky-400 mb-1.5 font-semibold">
    예상 연 주가 상승률
  </label>
  <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
    <input
      type="number"
      step="0.1"
      value={priceGrowthRate}
      onChange={(e) => setPriceGrowthRate(Number(e.target.value))}
      className="w-full bg-transparent text-right text-sky-400 font-bold focus:outline-none"
    />
    <span className="text-xs text-slate-500 ml-2">%</span>
  </div>
</div>
                    <div>
                        <label className="block text-xs text-rose-400 mb-1.5 font-semibold">예상 연 물가 상승률</label>
                        <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                            <input type="number" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))} className="w-full bg-transparent text-right text-rose-400 font-bold focus:outline-none" />
                            <span className="text-xs text-slate-500 ml-2">%</span>
                        </div>
                    </div>
                </div>

                {/* 패널 3: 타임라인 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white">⏳ 타임라인 설계 및 리스크</h3>
                    <div>
  <label className="block text-xs text-emerald-400 mb-1.5 font-semibold">
    목표 달성 전 배당 재투자율
  </label>
  <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
    <input
      type="number"
      min="0"
      max="100"
      step="5"
      value={beforeGoalReinvestRate}
      onChange={(e) => setBeforeGoalReinvestRate(Number(e.target.value))}
      className="w-full bg-transparent text-right text-emerald-400 font-bold focus:outline-none"
    />
    <span className="text-xs text-slate-500 ml-2">%</span>
  </div>
</div>

<div>
  <label className="block text-xs text-amber-400 mb-1.5 font-semibold">
    목표 달성 후 배당 재투자율
  </label>
  <div className="flex items-center bg-slate-950 rounded-lg p-2.5 border border-slate-800">
    <input
      type="number"
      min="0"
      max="100"
      step="5"
      value={afterGoalReinvestRate}
      onChange={(e) => setAfterGoalReinvestRate(Number(e.target.value))}
      className="w-full bg-transparent text-right text-amber-400 font-bold focus:outline-none"
    />
    <span className="text-xs text-slate-500 ml-2">%</span>
  </div>
</div>

                    <div className="pt-2">
                        <button 
                            onClick={() => setIsStressMode(!isStressMode)}
                            className={`w-full p-3 rounded-lg text-xs font-bold border transition-all duration-300 ${isStressMode ? 'bg-rose-950/40 border-rose-500 text-rose-400 shadow-lg shadow-rose-950/30' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                            {isStressMode ? '🚨 블랙스완 모드 활성화 (-30% 삭감)' : '⚠️ 하락장 스트레스 테스트'}
                        </button>
                    </div>
                </div>

                {/* 패널 4: 필터 */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white">📊 듀얼 배당 스케줄 보기 필터</h3>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">현금흐름 분산 가시성 필터 선택</label>
                        <div className="flex flex-col gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                            <button onClick={() => setSelectedCycleFilter('ALL')} className={`py-2 px-1 rounded text-xs transition-colors ${selectedCycleFilter === 'ALL' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'}`}>전체종합</button>
                            <button onClick={() => setSelectedCycleFilter('MID')} className={`py-2 px-1 rounded text-xs transition-colors ${selectedCycleFilter === 'MID' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'}`}>15일 배당</button>
                            <button onClick={() => setSelectedCycleFilter('END')} className={`py-2 px-1 rounded text-xs transition-colors ${selectedCycleFilter === 'END' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'}`}>말일 배당</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3구역: 차트 및 시각화 타임라인 */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-sm font-semibold text-white">📈 배당금 복리 성장 차트</h4>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-sm"></span>
                            세후 실수령 배당금
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                            물가반영 목표 생활비
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto pb-2 scrollbar-thin">
                    <div className="flex gap-2 items-end min-w-[920px] px-2 h-[260px] pt-8">
                        {simTimeline && simTimeline.filter((_, i) => i % Math.max(1, Math.floor(simTimeline.length / 45)) === 0).map((d) => {
                            let renderCash = d.netCash;
                            if (selectedCycleFilter === 'MID') renderCash = d.grossMid || 0;
                            if (selectedCycleFilter === 'END') renderCash = d.grossEnd || 0;

                            const maxScaleValue = Math.max(...simTimeline.map(t => Math.max(t.netCash, t.targetNeeded))) * 1.15 || 1;
                            const barHeightPct = Math.min((renderCash / maxScaleValue) * 100, 100);
                            const lineDotPct = Math.min((d.targetNeeded / maxScaleValue) * 100, 100);
                            const isTargetMet = d.netCash >= d.targetNeeded;

                            return (
                                <div key={d.month} className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                                    <div className="absolute bottom-[105%] hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] p-3 rounded-lg shadow-2xl border border-slate-800 z-50 w-[190px] pointer-events-none font-medium">
                                        <div className="font-bold text-white mb-1.5 border-b border-slate-800 pb-1 flex justify-between">
                                            <span>⏳ {Math.floor(d.month / 12)}년차 ({d.month}월)</span>
                                            <span className={isTargetMet ? 'text-emerald-400' : 'text-slate-500'}>
                                                {isTargetMet ? '은퇴 가능' : '축적 중'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 mb-1">
                                            <span>세후 배당금:</span>
                                            <span className="text-slate-200">{fmt(d.netCash)}원</span>
                                        </div>
                                        <div className="flex justify-between text-rose-400">
                                            <span>목표 생활비:</span>
                                            <span className="text-rose-200">{fmt(d.targetNeeded)}원</span>
                                        </div>
                                    </div>

                                    <div className="w-full relative h-full flex items-end">
                                        <div 
                                            className="absolute w-2 h-2 bg-rose-500 rounded-full left-1/2 -translate-x-1/2 z-20 shadow-[0_0_8px_rgba(239,68,68,0.6)] transition-all duration-500"
                                            style={{ bottom: `${lineDotPct}%` }}
                                        ></div>
                                        <div 
                                            className={`w-full rounded-t-sm transition-all duration-500 group-hover:brightness-125 ${
                                                isTargetMet 
                                                    ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400' 
                                                    : 'bg-gradient-to-t from-teal-700 via-teal-600 to-teal-500'
                                            }`}
                                            style={{ height: `${barHeightPct}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-slate-600 text-[9px] mt-2.5 font-semibold font-mono">{Math.floor(d.month / 12)}년</span>
                                </div>

                            );
                        })}
                    </div>
                </div>
            </div>
         <YearlyResultTable timeline={simTimeline} />
        </div>
    );
};

const YearlyResultTable = ({ timeline = [] }) => {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return null;
  }

  const yearlyRows = timeline.filter((row) => row.month % 12 === 0);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            📋 연도별 시뮬레이션 상세표
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            자산, 배당, 목표 생활비, 초과/부족 금액을 연도별로 확인합니다.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
  <th className="py-3 text-left">연도</th>
  <th className="py-3 text-right">총 자산</th>
  <th className="py-3 text-right">월 세전 배당</th>
  <th className="py-3 text-right">월 세금</th>
<th className="py-3 text-right">월 세후 배당</th>
<th className="py-3 text-right">재투자율</th>
<th className="py-3 text-right">목표 생활비</th>
  <th className="py-3 text-right">초과/부족</th>
  <th className="py-3 text-center">상태</th>
</tr>
          </thead>

          <tbody>
            {yearlyRows.map((row) => {
const reinvestRate = Number(row.reinvestRate || 0);
              const year = row.month / 12;

              const monthlyGross =
  Number(row.totalGross || 0) ||
  Number(row.grossMid || 0) + Number(row.grossEnd || 0);

const monthlyTax = Number(row.monthlyTax || 0);
  const netCash = Number(row.netCash || 0);
  const targetNeeded = Number(row.targetNeeded || 0);
  const gap = netCash - targetNeeded;
  const isReached = gap >= 0;

              return (
                <tr
                  key={row.month}
                  className="border-b border-slate-800 hover:bg-slate-800/60"
                >
                  <td className="py-3 text-slate-300 font-medium">
                    {year}년차
                  </td>

                  <td className="py-3 text-right text-sky-400 font-semibold">
        ₩{fmt(row.totalValue)}
      </td>

      <td className="py-3 text-right text-slate-300">
        ₩{fmt(monthlyGross)}
      </td>

      <td className="py-3 text-right text-rose-400">
        ₩{fmt(monthlyTax)}
      </td>

      <td className="py-3 text-right text-emerald-400 font-semibold">
        ₩{fmt(netCash)}
      </td>

<td className="py-3 text-right text-indigo-300 font-semibold">
  {fmt(reinvestRate)}%
</td>

      <td className="py-3 text-right text-amber-300">
        ₩{fmt(targetNeeded)}
      </td>

      <td
        className={`py-3 text-right font-semibold ${
          isReached ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {isReached ? "+" : "-"}₩{fmt(Math.abs(gap))}
      </td>

                  <td className="py-3 text-center">
        {isReached ? (
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
            달성
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-bold">
            부족
          </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowSimulator;