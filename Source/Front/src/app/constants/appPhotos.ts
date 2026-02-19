/**
 * Конфиг локальных фото: герой (жених/невеста), дресс-код (карусель), декоративные фото страниц.
 */
import dressCodeManifest from './dressCodeManifest.json';

const MIN_DRESS_SLOTS = 6;

const dressFromManifest = (dressCodeManifest as { images: string[] }).images ?? [];
const dressCode: string[] =
  dressFromManifest.length >= MIN_DRESS_SLOTS
    ? dressFromManifest
    : [...dressFromManifest, ...Array(MIN_DRESS_SLOTS - dressFromManifest.length).fill('')];

export const APP_PHOTOS = {
  heroGroom: '/images/photo/groom.jpg',
  heroBride: '/images/photo/bride.jpg',
  dressCode,
  preferences: {
    topLeft: '/images/background_photo/preferences_background_photo_3.jpg',
    topRight: '/images/background_photo/preferences_background_photo_4.jpg',
    bottomLeft: '/images/background_photo/preferences_background_photo_2.jpg',
    bottomRight: '/images/background_photo/preferences_background_photo_1.jpg',
  },
  wishlist: [
    '/images/background_photo/whish_list_photo_1.jpg',
    '/images/background_photo/whish_list_photo_2.jpg',
  ],
} as const;
