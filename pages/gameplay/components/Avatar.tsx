import React, { useEffect, useState } from 'react';
import './Avatar.css';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

interface AvatarProps {
    user: TelegramUser;
    size?: 'small' | 'medium' | 'large';
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'medium' }) => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (user.photo_url) {
            setAvatarUrl(user.photo_url);
        } else {
            // Генерация аватара по инициалам
            const initials = `${user.first_name[0]}${user.last_name?.[0] || ''}`;
            setAvatarUrl(`data:image/svg+xml,${encodeURIComponent(`
                <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="50" fill="#4a6baf"/>
                    <text x="50" y="65" font-size="40" text-anchor="middle" fill="white">${initials}</text>
                </svg>
            `)}`);
        }
    }, [user]);
    
    return (
        <div 
            className={`avatar avatar-${size}`}
            style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none' }}
            title={`${user.first_name} ${user.last_name || ''}`}
        />
    );
};

export default Avatar; 