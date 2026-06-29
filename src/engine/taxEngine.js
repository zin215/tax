// src/engine/taxEngine.js

/**
 * 특정 계좌 및 자산 카테고리의 배당금에 대한 세금과 세후 배당금을 계산합니다.
 * @param {number} preTaxDividend - 세전 배당금 (총 분배금액 기준)
 * @param {string} accountType - 계좌명 (일반, ISA, 연금저축 등)
 * @param {string} category - 자산 카테고리 (예: '커버드콜(국내)', '배당(미국)' 등)
 * @param {number} taxableRatio - 과표 비중 (주당과세표준액 / 분배금액) ★똑재님 시트 데이터 최우선
 * @returns {object} { taxAmount: 세금액, afterTaxDividend: 세후배당금 }
 */
export const calculateTax = (preTaxDividend, accountType, category = '', taxableRatio = 1) => {
    // 1. 과세이연 및 비과세 계좌 (세금 0원) - ISA, 연금저축 등
    if (['ISA', '연금', 'IRP', '금현물'].some(type => accountType.includes(type))) {
        return { taxAmount: 0, afterTaxDividend: preTaxDividend };
    }

    // 2. 일반계좌 세율 설정
    let rate = 0.154; // 기본 국내 배당소득세율 15.4%
    
    // 똑재님의 시트에서 계산되어 넘어온 과표 비중을 그대로 사용! (절대 1로 강제하지 않음)
    let effectiveTaxableRatio = taxableRatio; 

    // 3. 해외 직투 계좌인 경우에만 미국 현지 세율 15% 적용
    if (category.includes('미국직투') || category.includes('해외직투') || (category.includes('미국') && !category.includes('국내'))) {
        rate = 0.15; // 미국 배당소득세 15%
        
        // 해외 직투 커버드콜인데 시트에서 과표비중이 누락된 경우에만 방어용으로 30% 세팅
        if (effectiveTaxableRatio === 1 && category.includes('커버드콜')) {
            effectiveTaxableRatio = 0.3; 
        }
    } 
    // ※ '커버드콜(국내)'는 rate=0.154를 유지하되, effectiveTaxableRatio는 
    //    시트의 (과세표준액/분배금액) 비율을 그대로 곱하므로 세금이 확 줄어듭니다!

    // 4. 최종 세금 계산: 총 분배금 * 과표 비중 * 세율
    const taxAmount = preTaxDividend * effectiveTaxableRatio * rate;
    
    return {
        taxAmount,
        afterTaxDividend: preTaxDividend - taxAmount
    };
};

/**
 * 금융소득종합과세(연 2,000만 원 초과) 대상 판별 
 * (총 분배금이 아닌 '과세표준' 기준의 배당금만 합산됨)
 */
export const checkTaxThreshold = (totalTaxableDividend) => {
    const THRESHOLD = 20000000;
    return {
        isOverLimit: totalTaxableDividend > THRESHOLD,
        overAmount: Math.max(0, totalTaxableDividend - THRESHOLD)
    };
};