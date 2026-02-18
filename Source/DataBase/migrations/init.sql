-- Создание расширения для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица Sex (пол)
CREATE TABLE IF NOT EXISTS sex (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sex VARCHAR(10) NOT NULL UNIQUE CHECK (sex IN ('male', 'female'))
);

-- Вставка базовых значений пола
INSERT INTO sex (uuid, sex) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'male'),
    ('550e8400-e29b-41d4-a716-446655440001', 'female')
ON CONFLICT (sex) DO NOTHING;

-- Таблица Guests (гости)
CREATE TABLE IF NOT EXISTS guests (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id VARCHAR(50) UNIQUE NOT NULL, -- Внешний идентификатор из JSON (guest_1, guest_2, etc.)
    last_name VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    patronomic VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    sex_uuid UUID REFERENCES sex(uuid) ON DELETE RESTRICT,
    rsvp BOOLEAN DEFAULT NULL, -- Подтверждение присутствия (NULL - не ответил, TRUE - будет, FALSE - не будет)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы Guests
CREATE INDEX IF NOT EXISTS idx_guests_guest_id ON guests(guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_sex_uuid ON guests(sex_uuid);

-- Таблица food_preferences (предпочтения по еде)
CREATE TABLE IF NOT EXISTS food_preferences (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES guests(uuid) ON DELETE CASCADE,
    food_choice VARCHAR(50) NOT NULL CHECK (food_choice IN ('Мясо', 'Рыба', 'Веган', 'Нет предпочтений')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_uuid) -- Один пользователь может иметь только одно предпочтение по еде
);

-- Индекс для food_preferences
CREATE INDEX IF NOT EXISTS idx_food_preferences_user_uuid ON food_preferences(user_uuid);

-- Таблица alcohol_preferences (предпочтения по алкоголю)
CREATE TABLE IF NOT EXISTS alcohol_preferences (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES guests(uuid) ON DELETE CASCADE,
    alcohol_choice JSONB NOT NULL, -- Массив от 0 до 3 видов алкоголя (пустой = без предпочтений)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_uuid), -- Один пользователь может иметь только одно предпочтение по алкоголю
    CONSTRAINT check_alcohol_array_length CHECK (jsonb_array_length(alcohol_choice) >= 0 AND jsonb_array_length(alcohol_choice) <= 3)
);

-- Индекс для alcohol_preferences
CREATE INDEX IF NOT EXISTS idx_alcohol_preferences_user_uuid ON alcohol_preferences(user_uuid);
CREATE INDEX IF NOT EXISTS idx_alcohol_preferences_choice ON alcohol_preferences USING GIN (alcohol_choice);

-- Таблица allergies (аллергии)
CREATE TABLE IF NOT EXISTS allergies (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL REFERENCES guests(uuid) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для allergies
CREATE INDEX IF NOT EXISTS idx_allergies_user_uuid ON allergies(user_uuid);

-- Таблица Wishlist (список желаний)
CREATE TABLE IF NOT EXISTS wishlist (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_uuid UUID REFERENCES guests(uuid) ON DELETE SET NULL, -- NULL если предмет еще не выбран гостем
    item TEXT NOT NULL,
    link TEXT, -- Ссылка на подарок (опционально)
    wish_id VARCHAR(50) NOT NULL, -- Идентификатор желания из JSON (wish_1, wish_2, wish_3)
    owner_type VARCHAR(10) NOT NULL CHECK (owner_type IN ('bride', 'groom')), -- Кому принадлежит желание
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wish_id, owner_type) -- Один wish_id для каждого owner_type
);

-- Индексы для wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_uuid ON wishlist(user_uuid);
CREATE INDEX IF NOT EXISTS idx_wishlist_wish_id ON wishlist(wish_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_owner_type ON wishlist(owner_type);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_preferences_updated_at BEFORE UPDATE ON food_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alcohol_preferences_updated_at BEFORE UPDATE ON alcohol_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

