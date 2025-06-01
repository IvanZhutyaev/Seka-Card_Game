import React from 'react';
import { TelegramUser } from '../types/game';
import './Avatar.css';

interface AvatarProps {
    user: TelegramUser;
    size?: 'small' | 'medium' | 'large';
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'medium' }) => {
    // Если есть фото пользователя, используем его
    if (user.photo_url) {
        return (
            <div 
                className={`avatar avatar-${size}`}
                style={{ backgroundImage: `url(${user.photo_url})` }}
                title={user.first_name}
            />
        );
    }

    // Если фото нет, показываем инициалы
    const initials = user.first_name.charAt(0) + (user.last_name ? user.last_name.charAt(0) : '');
    
    return (
        <div 
            className={`avatar avatar-${size} avatar-initials`}
            title={user.first_name}
        >
            {initials}
        </div>
    );
};

export default Avatar; 