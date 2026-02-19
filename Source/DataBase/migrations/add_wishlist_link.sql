-- Миграция: Добавление поля link в таблицу wishlist
-- Добавляем поле link для хранения ссылок на подарки

ALTER TABLE wishlist 
ADD COLUMN IF NOT EXISTS link TEXT;

-- Комментарий к полю
COMMENT ON COLUMN wishlist.link IS 'Ссылка на подарок (опционально)';
