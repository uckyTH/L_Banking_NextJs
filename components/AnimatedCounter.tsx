"use client";

import CountUp from "react-countup";

export const AnimatedCounter = ({ amount }: { amount: number }) => {
  
  return (
    <div className="w-full">
      <CountUp end={amount} decimal="." prefix="$" decimals={2} />
    </div>
  );
};
