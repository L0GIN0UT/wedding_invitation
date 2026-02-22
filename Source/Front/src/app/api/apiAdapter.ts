import { apiRequest } from '../../utils/api';

const API_URL = window.location.origin + '/api';

/** Достаёт читаемое сообщение из detail ответа API (строка или массив ошибок валидации). */
function getErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0 && detail[0] && typeof (detail[0] as { msg?: string }).msg === 'string') {
    return (detail[0] as { msg: string }).msg;
  }
  return fallback;
}

// Auth API
export const authAPI = {
  sendCode: async (phone: string) => {
    const response = await apiRequest('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
      skipAuth: true,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Ошибка отправки кода');
    }
    return { success: true };
  },

  verifyCode: async (phone: string, code: string) => {
    const response = await apiRequest('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
      skipAuth: true,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Неверный код');
    }
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    };
  },

  validateToken: async (token: string) => {
    const response = await apiRequest('/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ access_token: token }),
      skipAuth: true,
    });
    const data = await response.json();
    return { valid: data.valid === true };
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
        skipAuth: true,
      });
    }
    return { success: true };
  }
};

// RSVP API
export const rsvpAPI = {
  get: async () => {
    const response = await apiRequest('/rsvp/', {
      refreshTokenCallback: async () => {
        // This will be handled by apiRequest automatically
        return false;
      }
    });
    const data = await response.json();
    return { rsvp: data.rsvp ?? null };
  },

  save: async (rsvp: boolean) => {
    const response = await apiRequest('/rsvp/', {
      method: 'POST',
      body: JSON.stringify({ rsvp }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка сохранения');
    }
    return { rsvp };
  }
};

// Preferences API
export const preferencesAPI = {
  getFormOptions: async () => {
    const response = await apiRequest('/preferences/form-options', {
      refreshTokenCallback: async () => {
        return false;
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('getFormOptions response:', data);
    
    return {
      food_choices: data.food_choices || [],
      alcohol_choices: data.alcohol_choices || []
    };
  },

  get: async (forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/';
    const response = await apiRequest(url, {
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    return {
      food_choice: data.food_preference || '',
      alcohol_choices: data.alcohol_preferences || [],
      allergens: data.allergies || [],
      have_allergies: data.have_allergies ?? null
    };
  },

  setHaveAllergies: async (haveAllergies: boolean, forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/have-allergies?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/have-allergies';
    const response = await apiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify({ have_allergies: haveAllergies }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка сохранения');
    }
    return {
      food_choice: data.food_preference || '',
      alcohol_choices: data.alcohol_preferences || [],
      allergens: data.allergies || [],
      have_allergies: data.have_allergies ?? null
    };
  },

  saveFood: async (food_choice: string, forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/food?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/food';
    const response = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ food_choice }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка сохранения');
    }
    return { food_choice };
  },

  saveAlcohol: async (alcohol_choices: string[], forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/alcohol?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/alcohol';
    const response = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ alcohol_choices }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(data.detail, 'Ошибка сохранения'));
    }
    return { alcohol_choices };
  },

  addAllergen: async (allergen: string, forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/allergies?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/allergies';
    const response = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ allergen }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка добавления');
    }
    const current = await preferencesAPI.get(forGuestUuid);
    return current;
  },

  removeAllergen: async (allergen: string, forGuestUuid?: string) => {
    const url = forGuestUuid
      ? `/preferences/allergies?for_guest_uuid=${encodeURIComponent(forGuestUuid)}`
      : '/preferences/allergies';
    const response = await apiRequest(url, {
      method: 'DELETE',
      body: JSON.stringify({ allergen }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка удаления');
    }
    const current = await preferencesAPI.get(forGuestUuid);
    return current;
  }
};

// Guests API (список гостей, famili_prefer_forms)
export interface GuestListItem {
  uuid: string;
  phone: string | null;
  last_name: string | null;
  first_name: string;
  patronomic: string | null;
}

export const guestsAPI = {
  getList: async (sortBy: string = 'last_name'): Promise<{ guests: GuestListItem[] }> => {
    const response = await apiRequest(`/guests?sort_by=${encodeURIComponent(sortBy)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка загрузки списка гостей');
    }
    return { guests: data.guests || [] };
  },

  addToFamiliPreferForms: async (guestUuid: string): Promise<void> => {
    const response = await apiRequest('/guests/famili-prefer-forms', {
      method: 'POST',
      body: JSON.stringify({ guest_uuid: guestUuid }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка добавления');
    }
  },

  removeFromFamiliPreferForms: async (guestUuid: string): Promise<void> => {
    const response = await apiRequest('/guests/famili-prefer-forms', {
      method: 'DELETE',
      body: JSON.stringify({ guest_uuid: guestUuid }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка удаления');
    }
  },

  getFamiliPreferForms: async (): Promise<{
    items: Array<{
      guest_uuid: string;
      last_name: string | null;
      first_name: string;
      patronomic: string | null;
      food_preference: string | null;
      alcohol_preferences: string[];
      allergies: string[];
      have_allergies: boolean | null;
    }>;
  }> => {
    const response = await apiRequest('/guests/famili-prefer-forms');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка загрузки');
    }
    return { items: data.items || [] };
  }
};

// Wishlist API
interface WishlistItem {
  uuid: string;
  wish_id: string;
  item: string;
  link?: string | null;
  owner_type: 'bride' | 'groom';
  user_uuid: string | null;
  created_at: string;
}

interface WishlistItemNew {
  wishlist_uuid: string;
  title: string;
  description?: string;
  price?: string;
  link?: string;
  user_uuid: string | null;
  category: 'bride' | 'groom' | 'general';
}

// Helper to map old format to new format
const mapWishlistItem = (item: WishlistItem): WishlistItemNew => ({
  wishlist_uuid: item.uuid,
  title: item.item,
  description: undefined,
  price: undefined,
  link: item.link || undefined,
  user_uuid: item.user_uuid,
  category: item.owner_type
});

export const wishlistAPI = {
  get: async () => {
    const response = await apiRequest('/wishlist/', {
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    console.log('Wishlist API raw data:', data);
    // API возвращает items, bride_items, groom_items
    const items: WishlistItem[] = data.items || data.bride_items?.concat(data.groom_items || []) || [];
    
    const mappedBride = (data.bride_items || items.filter(i => i.owner_type === 'bride')).map(mapWishlistItem);
    const mappedGroom = (data.groom_items || items.filter(i => i.owner_type === 'groom')).map(mapWishlistItem);
    
    console.log('Mapped bride items:', mappedBride);
    console.log('Mapped groom items:', mappedGroom);
    
    return {
      bride_items: mappedBride,
      groom_items: mappedGroom,
      current_user_uuid: data.current_user_uuid ?? null,
      general_items: []
    };
  },

  reserve: async (wishlist_uuid: string) => {
    const response = await apiRequest('/wishlist/reserve', {
      method: 'POST',
      body: JSON.stringify({ wishlist_uuid }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка бронирования');
    }
    return { success: true };
  },

  unreserve: async (wishlist_uuid: string) => {
    const response = await apiRequest('/wishlist/unreserve', {
      method: 'POST',
      body: JSON.stringify({ wishlist_uuid }),
      refreshTokenCallback: async () => {
        return false;
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка отмены бронирования');
    }
    return { success: true };
  }
};

// Кеш stream URL по path: тот же path в пределах TTL даёт один URL (совпадает с бэкендом).
// TTL чуть меньше MEDIA_TOKEN_TTL (55 мин), чтобы не использовать просроченный токен.
const STREAM_URL_CACHE_TTL_MS = 55 * 60 * 1000;
const streamUrlCache: Record<string, { url: string; expiresAt: number }> = {};

// Gallery (медиа из файлового хранилища по токену)
export const galleryAPI = {
  /** Флаг: показывать ли контент галереи (видео/фото). Если false — показать «скоро после мероприятия». */
  getStatus: async (): Promise<{ content_enabled: boolean }> => {
    const response = await apiRequest('/gallery/status');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Ошибка получения статуса галереи');
    return { content_enabled: data.content_enabled ?? true };
  },

  /** URL для просмотра файла (img/video). Результат кешируется по path, чтобы браузер кешировал по одному URL. */
  getStreamUrl: async (path: string): Promise<{ url: string }> => {
    const cached = streamUrlCache[path];
    if (cached && cached.expiresAt > Date.now()) {
      return { url: cached.url };
    }
    const response = await apiRequest(`/gallery/stream-url?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Ошибка получения URL');
    const url = data.url as string;
    streamUrlCache[path] = { url, expiresAt: Date.now() + STREAM_URL_CACHE_TTL_MS };
    return { url };
  },

  /** Список относительных путей файлов в папке (couple_photo, dress_code, background_photo и т.д.) */
  listFiles: async (folder: string): Promise<{ folder: string; paths: string[] }> => {
    const response = await apiRequest(`/gallery/list?folder=${encodeURIComponent(folder)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Ошибка списка файлов');
    return { folder: data.folder, paths: data.paths || [] };
  },

  /** URL для скачивания файла (только wedding_day_all_photos и wedding_day_video) */
  getDownloadUrl: async (path: string): Promise<{ url: string }> => {
    const response = await apiRequest(`/gallery/download-url?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Ошибка получения URL скачивания');
    return { url: data.url };
  },

  /** URL для скачивания архива (wedding_day_all_photos, wedding_day_video или wedding_best_moments) */
  getArchiveUrl: async (type: 'wedding_day_all_photos' | 'wedding_day_video' | 'wedding_best_moments'): Promise<{ url: string }> => {
    const response = await apiRequest(`/gallery/archive-url?type=${encodeURIComponent(type)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Ошибка получения URL архива');
    return { url: data.url };
  },
};
