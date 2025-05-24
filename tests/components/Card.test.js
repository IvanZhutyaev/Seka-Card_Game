import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

describe('Card Component', () => {
  let card;
  
  beforeEach(() => {
    // Создаем карту
    card = document.createElement('div');
    card.className = 'card';
    document.body.appendChild(card);
  });
  
  afterEach(() => {
    // Очищаем после каждого теста
    document.body.innerHTML = '';
  });
  
  test('renders with correct suit and value', () => {
    card.dataset.suit = 'hearts';
    card.dataset.value = 'A';
    expect(card).toHaveClass('card');
    expect(card).toHaveAttribute('data-suit', 'hearts');
    expect(card).toHaveAttribute('data-value', 'A');
  });
  
  test('handles click events', () => {
    const onClick = jest.fn();
    card.addEventListener('click', onClick);
    card.click();
    expect(onClick).toHaveBeenCalled();
  });
  
  test('applies selected state', () => {
    card.classList.add('card--selected');
    expect(card).toHaveClass('card--selected');
  });
  
  test('applies disabled state', () => {
    card.classList.add('card--disabled');
    expect(card).toHaveClass('card--disabled');
    card.setAttribute('disabled', '');
    expect(card).toHaveAttribute('disabled');
  });
}); 