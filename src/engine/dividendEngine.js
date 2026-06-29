// src/engine/dividendEngine.js

/**
 * 개별 종목의 연간 배당금을 계산합니다.
 * @param {number} quantity - 보유 수량
 * @param {number} dps - 1주당 배당금(Dividend Per Share)
 * @param {string} cycle - 배당 주기 ('월', '분기', '반기', '연')
 * @returns {number} 연간 총 배당금
 */
export const calculateAnnualDividend = (quantity, dps, cycle = '') => {
    const qty = Number(quantity) || 0;
    const divPerShare = Number(dps) || 0;
    
    let multiplier = 1; // 기본값 (연배당)
    if (cycle.includes('월')) multiplier = 12;
    else if (cycle.includes('분기')) multiplier = 4;
    else if (cycle.includes('반기')) multiplier = 2;

    return qty * divPerShare * multiplier;
};

/**
 * 포트폴리오 전체의 배당 요약 정보를 계산합니다.
 * (추후 컴포넌트에서 전체 통계를 낼 때 사용)
 */
export const calculatePortfolioYield = (assets) => {
    let totalInvested = 0;
    let totalDividend = 0;

    assets.forEach(asset => {
        const invested = (Number(asset.quantity) || 0) * (Number(asset.avgPrice) || 0);
        const dividend = calculateAnnualDividend(asset.quantity, asset.dps, asset.divCycle);
        
        totalInvested += invested;
        totalDividend += dividend;
    });

    return {
        totalInvested,
        totalDividend,
        portfolioYield: totalInvested > 0 ? (totalDividend / totalInvested) * 100 : 0
    };
};