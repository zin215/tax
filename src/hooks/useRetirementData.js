// src/hooks/useRetirementData.js
import { useMemo } from 'react';

export const useRetirementData = (portfolioData) => {
    return useMemo(() => {
        // 데이터가 없으면 빈 배열 반환
        if (!portfolioData) return [];
        
        // 6개 계좌 데이터를 하나로 합쳐서 은퇴 시뮬레이터로 넘김
        return Object.values(portfolioData).flat().filter(Boolean);
    }, [portfolioData]);
};