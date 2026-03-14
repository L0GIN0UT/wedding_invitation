-- Миграция: Добавление поля is_donation в таблицу wishlist
-- Флаг для позиций вишлиста типа "денежный подарок" — у них не нужна кнопка бронирования

ALTER TABLE wishlist
ADD COLUMN IF NOT EXISTS is_donation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN wishlist.is_donation IS 'Флаг денежного подарка — не показывать кнопку бронирования';
