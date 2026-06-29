import { useMemo } from 'react';

// 똑재님의 6개 계좌 데이터를 합산하여 시뮬레이션용 수치를 뽑아내는 훅
export const useRetirementSimulator = (portfolioData) => {
    return useMemo(() => {
        // 1. 전체 자산 합계
        const totalAssets = Object.values(portfolioData)
            .flat()
            .reduce((sum, item) => sum + (Number(item.currentPrice) * Number(item.quantity)), 0);

        // 2. 월 배당 총액 (세후)
        const totalMonthlyDividend = Object.values(portfolioData)
            .flat()
            .reduce((sum, item) => sum + (item.afterTaxDividend || 0), 0);

        return {
            totalAssets,
            totalMonthlyDividend,
            // 추가: 은퇴 시 필요한 최소 자산 계산 로직 등도 여기에 추가 가능
        };
    }, [portfolioData]);
};