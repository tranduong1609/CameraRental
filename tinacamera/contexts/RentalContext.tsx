import React, { createContext, useContext, useState } from 'react';

interface RentalContextType {
  startDate: string | null;  // 'YYYY-MM-DD'
  endDate: string | null;    // 'YYYY-MM-DD'
  totalDays: number;
  setDates: (start: string | null, end: string | null) => void;
  clearDates: () => void;
}

const RentalContext = createContext<RentalContextType>({
  startDate: null,
  endDate: null,
  totalDays: 0,
  setDates: () => {},
  clearDates: () => {},
});

export function useRental() {
  return useContext(RentalContext);
}

function calcDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function RentalProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const setDates = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const totalDays = calcDays(startDate, endDate);

  return (
    <RentalContext.Provider value={{ startDate, endDate, totalDays, setDates, clearDates }}>
      {children}
    </RentalContext.Provider>
  );
}
