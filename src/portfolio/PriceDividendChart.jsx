import React, { useState, useMemo } from "react";

const fmt = (num) => new Intl.NumberFormat("ko-KR").format(Math.round(num || 0));

const PriceDividendChart = ({ history }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    const chartData = useMemo(() => {
        if (!history || history.length === 0) return null;
        
        const prices = history.map(h => Number(h.price) || 0);
        const dividends = history.map(h => Number(h.dividend) || 0);
        
        let maxP = Math.max(...prices);
        let minP = Math.min(...prices);
        let maxD = Math.max(...dividends) || 1;

        // 주가(Price) 깔끔한 눈금 (4칸 기준)
        const pRange = maxP - minP || 1;
        const pMag = Math.pow(10, Math.floor(Math.log10(pRange / 4 || 1))); 
        const niceMinP = Math.floor(minP / pMag) * pMag; 
        const requiredStep = (maxP - niceMinP) / 4;
        const pStep = Math.ceil(requiredStep / pMag) * pMag; 
        const niceMaxP = niceMinP + (pStep * 4); 

        // 배당금(Dividend) 깔끔한 눈금 (하단 2칸 기준)
        const dMag = Math.pow(10, Math.floor(Math.log10(maxD / 2 || 1)));
        const dStep = Math.ceil((maxD / 2) / dMag) * dMag;
        const niceMaxD = dStep * 2;

        return {
            maxPrice: niceMaxP,
            minPrice: niceMinP,
            maxDividend: niceMaxD,
            pStep,
            prices,
            dividends
        };
    }, [history]);

    if (!chartData) return <div className="h-full flex items-center justify-center text-slate-600">데이터가 없습니다.</div>;

    const chartStep = history.length > 1 ? 780 / (history.length - 1) : 0;

    return (
        <svg viewBox="0 0 900 300" className="w-full h-full p-4" onMouseLeave={() => setHoverIndex(null)}>
           {/* 1. Grid & 좌측 주가 눈금 (차트 전체 높이 사용) */}
            {[0, 1, 2, 3, 4].map(i => {
                const yPos = 250 - (i * 45); // 차트 바닥(250)부터 꼭대기(70)까지
                const pVal = chartData.minPrice + (i * chartData.pStep);
                
                return (
                    <g key={`grid-${i}`}>
                        <line x1="60" x2="840" y1={yPos} y2={yPos} stroke="#334155" strokeDasharray="4 4" />
                        <text x="50" y={yPos + 4} fontSize="11" textAnchor="end" fill="#94a3b8">{fmt(pVal)}</text>
                    </g>
                );
            })}

            {/* 2. 우측 배당금 눈금 (★하단 60px 영역에만 딱 3개 표시) */}
            {[0, 1, 2].map(i => {
                const yPos = 250 - (i * 30); // 250, 220, 190 (바닥에만 위치함)
                const dVal = i * (chartData.maxDividend / 2);
                
                return (
                    <text key={`d-axis-${i}`} x="850" y={yPos + 4} fontSize="10" textAnchor="start" fill="#38bdf8">
                        {fmt(dVal)}
                    </text>
                );
            })}

            {/* 3. 분배금 막대 (우측 눈금과 높이 완벽 일치) */}
            {history.map((h, i) => {
                const x = 60 + i * chartStep;
                // 배당금 막대도 우측 눈금에 맞춰 최대 60px까지만 올라감
                const barHeight = (Number(h.dividend) / chartData.maxDividend) * 60; 
                return <rect key={`bar-${i}`} x={x - 10} y={250 - barHeight} width="20" height={barHeight} className="fill-sky-500/40" rx="4" />;
            })}

            {/* 주가 선 */}
            <polyline
                fill="none" stroke="#34d399" strokeWidth="3"
                points={history.map((h, i) => {
                    const x = 60 + i * chartStep;
                    const y = 250 - ((Number(h.price) - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice || 1)) * 180;
                    return `${x},${y}`;
                }).join(" ")}
            />

            {/* 데이터 포인트 (마우스 이벤트 영역) */}
            {history.map((h, i) => {
                const x = 60 + i * chartStep;
                const y = 250 - ((Number(h.price) - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice || 1)) * 180;
                return (
                    <g key={`pt-${i}`}>
                        <circle cx={x} cy={y} r="5" fill="#34F399" onMouseEnter={() => setHoverIndex(i)} className="cursor-pointer" />
                        <text 
                x={x} 
                y="280" 
                fontSize="10" 
                fill="#94a3b8"
                textAnchor="start" // 글자 시작점을 점의 X좌표에 맞춤
                transform={`rotate(45, ${x}, 280)`} // 45도 회전 적용
            >
                {String(h.date).substring(2, 7)}
            </text>
                    </g>
                );
            })}

            {/* 정보 툴팁 */}
            {hoverIndex !== null && (
                <g pointerEvents="none">
                    <line x1={60 + hoverIndex * chartStep} y1="50" x2={60 + hoverIndex * chartStep} y2="250" stroke="#94a3b8" />
                    <rect x={60 + hoverIndex * chartStep + 10} y="50" width="160" height="90" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x={60 + hoverIndex * chartStep + 20} y="70" fill="#fff" fontSize="12" fontWeight="bold">{history[hoverIndex].date}</text>
                    <text x={60 + hoverIndex * chartStep + 20} y="90" fill="#34d399" fontSize="11">주가: {fmt(history[hoverIndex].price)}원</text>
                    <text x={60 + hoverIndex * chartStep + 20} y="110" fill="#38bdf8" fontSize="11">분배금: {fmt(history[hoverIndex].dividend)}원</text>
                    <text x={60 + hoverIndex * chartStep + 20} y="130" fill="#fbbf24" fontSize="11">과표: {fmt(history[hoverIndex].taxBase)}원</text>
                </g>
            )}
        </svg>
    );
};

export default PriceDividendChart;