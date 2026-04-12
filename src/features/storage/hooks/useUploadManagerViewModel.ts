'use client';

import { useState, useEffect } from 'react';
import { useUploadStore } from '../store/uploadStore';

export function useUploadManagerViewModel() {
    const { uploads, removeUpload } = useUploadStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isOnline, setIsOnline] = useState(true);

    const uploadList = Object.values(uploads);
    const hasUploads = uploadList.length > 0;

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        if (typeof window !== 'undefined') {
            setIsOnline(window.navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    return {
        uploadList,
        hasUploads,
        isExpanded,
        toggleExpanded,
        isOnline,
        removeUpload
    };
}
