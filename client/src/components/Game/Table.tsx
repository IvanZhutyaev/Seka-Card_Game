import React from 'react';

export const Table: React.FC<any> = ({ bank, currentBet }) => {
  return (
    <div className="table">
      <div>Bank: {bank}</div>
      <div>Bet: {currentBet}</div>
    </div>
  );
}; 