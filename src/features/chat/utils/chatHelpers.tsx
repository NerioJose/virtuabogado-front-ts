'use client';

import React from 'react';
import { FiImage, FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';

const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'mp3', 'wav', 'mp4', 'mov'];

export const linkifyText = (text: string, isMe: boolean, azulPrimarioClass: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|io|co|es|cl|mx|ar|pe|co\.ve)(?:\/[^\s]*)?)/gi;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
        if (part && part.match(urlRegex)) {
            let cleanUrl = part;
            let suffix = '';
            const lastChar = cleanUrl.slice(-1);
            if (['.', ',', ')', '!', '?', ';'].includes(lastChar)) {
                suffix = lastChar;
                cleanUrl = cleanUrl.slice(0, -1);
            }

            const href = cleanUrl.startsWith('http') 
                ? cleanUrl 
                : `https://${cleanUrl.startsWith('www.') ? cleanUrl : cleanUrl}`;

            return (
                <span key={i}>
                    <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`${isMe ? 'text-white underline hover:text-blue-100' : `${azulPrimarioClass} underline hover:text-azul-primario/80`} transition-opacity break-all font-medium`}
                    >
                        {cleanUrl}
                    </a>
                    {suffix}
                </span>
            );
        }
        return part;
    });
};

export const getMessageContentInfo = (content: string) => {
    let isMedia = false;
    let url = '';
    let fileName = 'Archivo';
    let extension = '';

    const mdLinkRegex = /\[(.*?)\]\((https?:\/\/.*?)\)/;
    const match = content.match(mdLinkRegex);

    if (match) {
        isMedia = true;
        fileName = match[1];
        url = match[2];
        extension = url.split('.').pop()?.split('?')[0].toLowerCase() || '';
    } else if (content.startsWith('http') || content.startsWith('www.') || content.match(/^[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|io|co|es|cl|mx|ar|pe|co\.ve)/i)) {
        const tempUrl = content.split('?')[0].toLowerCase();
        const hasMediaExtension = MEDIA_EXTENSIONS.some(ext => tempUrl.endsWith(`.${ext}`));
        
        if (hasMediaExtension) {
            isMedia = true;
            url = content;
            fileName = url.split('/').pop()?.split('?')[0] || 'Archivo';
            extension = url.split('.').pop()?.split('?')[0].toLowerCase() || '';
        }
    }

    return { isMedia, url, fileName, extension };
};
