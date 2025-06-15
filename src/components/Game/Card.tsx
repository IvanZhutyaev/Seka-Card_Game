import React from 'react';

export const CardUI: React.FC<any> = ({ suit, rank }) => {
  return (
    <div className="card">
      {rank}{suit}
    </div>
  );
}; 