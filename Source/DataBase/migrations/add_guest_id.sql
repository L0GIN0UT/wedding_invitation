-- Миграция: добавление поля guest_id для предотвращения дублирования гостей
-- Дата: 2025-11-22

-- Проверяем, есть ли уже поле guest_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests' AND column_name = 'guest_id'
    ) THEN
        -- Добавляем поле guest_id
        ALTER TABLE guests ADD COLUMN guest_id VARCHAR(50);
        
        -- Генерируем guest_id для существующих записей на основе uuid
        -- (для существующих гостей используем формат "legacy_<uuid>")
        UPDATE guests SET guest_id = 'legacy_' || uuid::text WHERE guest_id IS NULL;
        
        -- Делаем поле обязательным и уникальным
        ALTER TABLE guests ALTER COLUMN guest_id SET NOT NULL;
        ALTER TABLE guests ADD CONSTRAINT guests_guest_id_unique UNIQUE (guest_id);
        
        -- Создаем индекс
        CREATE INDEX idx_guests_guest_id ON guests(guest_id);
        
        RAISE NOTICE 'Поле guest_id успешно добавлено';
    ELSE
        RAISE NOTICE 'Поле guest_id уже существует';
    END IF;
END $$;

