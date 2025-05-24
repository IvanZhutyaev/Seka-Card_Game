import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

describe('GameBoard Component', () => {
  let gameBoard;
  
  beforeEach(() => {
    gameBoard = document.createElement('div');
    gameBoard.className = 'game-board';
    document.body.appendChild(gameBoard);
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });
  
  test('renders with correct layout', () => {
    expect(gameBoard).toHaveClass('game-board');
    expect(gameBoard.querySelector('.game-board__table')).toBeTruthy();
    expect(gameBoard.querySelector('.game-board__players')).toBeTruthy();
  });
  
  test('updates game state', () => {
    const gameState = {
      status: 'playing',
      players: [
        { userId: 1, username: 'Player 1', cards: [], score: 0 },
        { userId: 2, username: 'Player 2', cards: [], score: 0 }
      ],
      currentPlayer: 1,
      table: []
    };
    
    gameBoard.dataset.gameState = JSON.stringify(gameState);
    expect(JSON.parse(gameBoard.dataset.gameState)).toEqual(gameState);
  });
  
  test('handles player actions', () => {
    const onAction = jest.fn();
    gameBoard.addEventListener('game:action', onAction);
    
    const action = {
      type: 'play',
      cardId: 'card1'
    };
    
    gameBoard.dispatchEvent(new CustomEvent('game:action', { detail: action }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ detail: action }));
  });
  
  test('shows game over state', () => {
    gameBoard.classList.add('game-board--game-over');
    expect(gameBoard).toHaveClass('game-board--game-over');
    expect(gameBoard.querySelector('.game-board__game-over')).toBeTruthy();
  });
}); 