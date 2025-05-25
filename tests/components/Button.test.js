/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Button Component', () => {
    const defaultProps = {
        onClick: jest.fn(),
        variant: 'primary',
        disabled: false,
        children: 'Click me'
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with primary style by default', () => {
        render(<Button {...defaultProps} />);
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button).toHaveClass('button');
        expect(button).not.toHaveClass('button--secondary');
    });

    test('renders with secondary style when specified', () => {
        render(<Button {...defaultProps} variant="secondary" />);
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button).toHaveClass('button--secondary');
    });

    test('handles click events', () => {
        render(<Button {...defaultProps} />);
        const button = screen.getByRole('button', { name: 'Click me' });
        fireEvent.click(button);
        expect(defaultProps.onClick).toHaveBeenCalled();
    });

    test('can be disabled', () => {
        render(<Button {...defaultProps} disabled={true} />);
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    test('renders children correctly', () => {
        render(
            <Button {...defaultProps}>
                <span>Custom content</span>
            </Button>
        );
        expect(screen.getByText('Custom content')).toBeInTheDocument();
    });

    test('applies custom className', () => {
        render(<Button {...defaultProps} className="custom-class" />);
        const button = screen.getByRole('button', { name: 'Click me' });
        expect(button).toHaveClass('custom-class');
    });
}); 