/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Card Component', () => {
    const defaultProps = {
        suit: 'hearts',
        value: 'A',
        onClick: jest.fn(),
        selected: false,
        disabled: false
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with correct suit and value', () => {
        render(<Card {...defaultProps} />);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('card');
        expect(card).toHaveAttribute('data-suit', 'hearts');
        expect(card).toHaveAttribute('data-value', 'A');
        expect(screen.getByText('♥A')).toBeInTheDocument();
    });

    test('handles click events', () => {
        render(<Card {...defaultProps} />);
        const card = screen.getByTestId('card');
        fireEvent.click(card);
        expect(defaultProps.onClick).toHaveBeenCalled();
    });

    test('applies selected state', () => {
        render(<Card {...defaultProps} selected={true} />);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('card--selected');
    });

    test('applies disabled state', () => {
        render(<Card {...defaultProps} disabled={true} />);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('card--disabled');
        expect(card).toHaveAttribute('disabled');
    });

    test('prevents click when disabled', () => {
        render(<Card {...defaultProps} disabled={true} />);
        const card = screen.getByTestId('card');
        fireEvent.click(card);
        expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    test('renders face down when hidden', () => {
        render(<Card {...defaultProps} hidden={true} />);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('card--hidden');
        expect(screen.queryByText('♥A')).not.toBeInTheDocument();
    });
}); 