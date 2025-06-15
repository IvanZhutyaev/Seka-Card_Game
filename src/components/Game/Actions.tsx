import React from 'react';

export const Actions: React.FC<any> = ({ isMyTurn }) => {
  return (
    <div className="actions">
      <button disabled={!isMyTurn}>Bet</button>
      <button disabled={!isMyTurn}>Fold</button>
    </div>
  );
}; 