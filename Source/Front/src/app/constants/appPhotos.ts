/**
 * Относительные пути к фото в файловом хранилище.
 * Реальные URL получаются через API /gallery/stream-url (с медиа-токеном).
 */
export const PHOTO_PATHS = {
  heroGroom: 'couple_photo/groom.jpg',
  heroBride: 'couple_photo/bride.jpg',
  preferences: {
    topLeft: 'background_photo/preferences_background_photo_3.jpg',
    topRight: 'background_photo/preferences_background_photo_4.jpg',
    bottomLeft: 'background_photo/preferences_background_photo_2.jpg',
    bottomRight: 'background_photo/preferences_background_photo_1.jpg',
  },
  wishlist: [
    'background_photo/whish_list_photo_1.jpg',
    'background_photo/whish_list_photo_2.jpg',
  ],
} as const;

/** Папка дресс-кода: список файлов запрашивается через gallery/list?folder=dress_code */
export const DRESS_CODE_FOLDER = 'dress_code' as const;
