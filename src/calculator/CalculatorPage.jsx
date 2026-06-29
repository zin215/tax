// Calculator.js
import React, { useState, useMemo } from 'react';

// 포맷팅 함수 (금액 뒤에 '원' 표시)
const fmtAmt = (num) => new Intl.NumberFormat('ko-KR').format(Math.round(num)) + '원';

const QuickCalculators = () => {
    // [1] 은퇴 목표 자금 계산기 상태
    const [monthlyExpense, setMonthlyExpense] = useState(300); // 만원 단위
    const [inflationRate, setInflationRate] = useState(2.0);
    const [yearsToRetire, setYearsToRetire] = useState(10);

    const retirementTarget = useMemo(() => {
        // 미래 물가상승률 반영한 월 생활비
        const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflationRate / 100, yearsToRetire);
        const annualExpense = futureMonthlyExpense * 12;
        // 4% 룰 기준 필요 자산 (연 생활비 / 0.04)
        const requiredCapital = annualExpense / 0.04; 
        
        return { 
            futureMonthlyExpense: futureMonthlyExpense * 10000, 
            requiredCapital: requiredCapital * 10000 
        };
    }, [monthlyExpense, inflationRate, yearsToRetire]);

    // [2] 복리 적립식 계산기 상태
    const [initialCapital, setInitialCapital] = useState(1000); // 만원 단위
    const [monthlyAdd, setMonthlyAdd] = useState(100);       // 만원 단위
    const [annualReturn, setAnnualReturn] = useState(8.0);
    const [investYears, setInvestYears] = useState(10);

    // 복리 계산 엔진 (누락되었던 로직 복구 완료 ✨)
    const compoundResult = useMemo(() => {
        const months = investYears * 12;
        const monthlyRate = annualReturn / 100 / 12; // 월 수익률
        
        let currentFutureValue = initialCapital * 10000; // 초기 자산 (원 단위 변환)
        const monthlyAddWon = monthlyAdd * 10000;        // 매월 적립액 (원 단위 변환)
        const totalInvested = (initialCapital * 10000) + (monthlyAddWon * months); // 총 원금

        // 매달 복리 가산 및 적립 진행
        for (let i = 0; i < months; i++) {
            currentFutureValue = (currentFutureValue + monthlyAddWon) * (1 + monthlyRate);
        }

        const profit = currentFutureValue - totalInvested; // 순수익

        return {
            futureValue: currentFutureValue,
            totalInvested: totalInvested,
            profit: profit
        };
    }, [initialCapital, monthlyAdd, annualReturn, investYears]);

    return (
        <div className="p-6 bg-slate-900 text-white min-h-screen space-y-8">
            <h2 className="text-xl font-bold border-b border-slate-700 pb-3">🧮 3초 초간단 계산기 팩</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 왼쪽: 은퇴 목표 자금 계산기 */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                    <h3 className="text-md font-bold text-amber-400 mb-4">🎯 미래 목표 생활비 & 필요 자산</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">현재 기준 희망 월 생활비</label>
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                <input type="number" value={monthlyExpense} onChange={(e) => setMonthlyExpense(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                <span className="text-slate-500 px-2 text-sm">만원</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">예상 물가 상승률</label>
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                <input type="number" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                <span className="text-slate-500 px-2 text-sm">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">은퇴까지 남은 기간</label>
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                <input type="number" value={yearsToRetire} onChange={(e) => setYearsToRetire(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                <span className="text-slate-500 px-2 text-sm">년</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 bg-amber-900/20 border border-amber-500/30 rounded-xl p-5">
                        <div className="flex justify-between items-end mb-3">
                            <div className="text-xs text-amber-300">인플레 반영 월 생활비</div>
                            <div className="text-xl font-bold text-amber-400">{fmtAmt(retirementTarget.futureMonthlyExpense)}</div>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-amber-500/20">
                            <div className="text-xs text-rose-300 font-bold">4% 룰 필요 은퇴 자산</div>
                            <div className="text-xl font-bold text-rose-400">{fmtAmt(retirementTarget.requiredCapital)}</div>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 거치+적립식 복리 계산기 */}
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                    <h3 className="text-md font-bold text-green-400 mb-4">📈 거치 및 적립식 복리 시뮬레이터</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">초기 자본금 (거치액)</label>
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                <span className="text-slate-500 px-2 text-sm">만원</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">매월 추가 적립액</label>
                            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                <input type="number" value={monthlyAdd} onChange={(e) => setMonthlyAdd(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                <span className="text-slate-500 px-2 text-sm">만원</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">목표 연수익률</label>
                                <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                    <input type="number" step="0.1" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                    <span className="text-slate-500 px-2 text-sm">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">투자 유지 기간</label>
                                <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden p-1 bg-slate-950">
                                    <input type="number" value={investYears} onChange={(e) => setInvestYears(Number(e.target.value))} className="w-full bg-transparent text-white p-2 focus:outline-none text-right font-mono" />
                                    <span className="text-slate-500 px-2 text-sm">년</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-xl p-5">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-xs text-green-300">최종 예상 자산</div>
                            <div className="text-2xl font-bold text-green-400">{fmtAmt(compoundResult.futureValue)}</div>
                        </div>
                        <div className="space-y-1 mt-2 pt-2 border-t border-green-500/20 text-[11px]">
                            <div className="flex justify-between text-slate-400"><span>총 납입 원금</span><span className="text-slate-300 font-mono">{fmtAmt(compoundResult.totalInvested)}</span></div>
                            <div className="flex justify-between text-slate-400"><span>누적 복리 수익</span><span className="text-green-400 font-mono">+{fmtAmt(compoundResult.profit)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickCalculators;