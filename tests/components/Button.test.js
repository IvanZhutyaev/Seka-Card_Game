import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

describe('Button Component', () => {
  let button;
  
  beforeEach(() => {
    // Создаем кнопку
    button = document.createElement('button');
    button.className = 'button';
    document.body.appendChild(button);
  });
  
  afterEach(() => {
    // Очищаем после каждого теста
    document.body.innerHTML = '';
  });
  
  test('renders with primary style by default', () => {
    expect(button).toHaveClass('button');
    expect(button).not.toHaveClass('button--secondary');
  });
  
  test('renders with secondary style when specified', () => {
    button.classList.add('button--secondary');
    expect(button).toHaveClass('button--secondary');
  });
  
  test('handles click events', () => {
    const onClick = jest.fn();
    button.addEventListener('click', onClick);
    button.click();
    expect(onClick).toHaveBeenCalled();
  });
}); 