import { apiClient } from '@/lib/apiClient';
import { AuthSettings } from '../types';

class AuthSettingsService {
    private readonly BASE_URL = '/api/settings/auth';

    get(): Promise<AuthSettings> {
        return apiClient.get<AuthSettings>(this.BASE_URL);
    }

    update(requireEmailConfirmation: boolean): Promise<AuthSettings> {
        return apiClient.patch<AuthSettings>(this.BASE_URL, {
            requireEmailConfirmation,
        });
    }
}

export const authSettingsService = new AuthSettingsService();
