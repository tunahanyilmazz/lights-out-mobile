-- Lights Out Oyunu için Supabase Veritabanı Tabloları
-- Bu SQL script'ini Supabase SQL Editor'da çalıştırın

-- 1. Users tablosu (Firebase Auth ile entegre)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Game Sessions tablosu (Oyun oturumları)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    total_levels_played INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    highest_level_reached INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Level Completions tablosu (Bölüm tamamlama kayıtları)
CREATE TABLE IF NOT EXISTS level_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    grid_size INTEGER NOT NULL,
    shape_type TEXT NOT NULL, -- 'square', 'L', 'T', 'plus', 'triangle', 'hexagon'
    has_fixed_squares BOOLEAN DEFAULT FALSE,
    has_diagonal_toggle BOOLEAN DEFAULT FALSE,
    moves_count INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User Statistics tablosu (Kullanıcı istatistikleri)
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_games_played INTEGER DEFAULT 0,
    total_levels_completed INTEGER DEFAULT 0,
    total_play_time_seconds INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    best_level_reached INTEGER DEFAULT 0,
    average_moves_per_level DECIMAL(5,2) DEFAULT 0,
    average_time_per_level DECIMAL(5,2) DEFAULT 0,
    favorite_shape TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Leaderboard tablosu (Skor tablosu)
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    moves_count INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    shape_type TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_level_completions_user_id ON level_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_level_completions_level ON level_completions(level_number);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON leaderboard(level_number);
CREATE INDEX IF NOT EXISTS idx_leaderboard_moves ON leaderboard(moves_count);
CREATE INDEX IF NOT EXISTS idx_leaderboard_time ON leaderboard(time_seconds);

-- Row Level Security (RLS) Politikaları (geçici olarak devre dışı)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE level_completions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Users tablosu için RLS politikaları (geçici olarak devre dışı)
-- CREATE POLICY "Users can view own profile" ON users
--     FOR SELECT USING (auth.uid()::text = firebase_uid);

-- CREATE POLICY "Users can update own profile" ON users
--     FOR UPDATE USING (auth.uid()::text = firebase_uid);

-- CREATE POLICY "Users can insert own profile" ON users
--     FOR INSERT WITH CHECK (auth.uid()::text = firebase_uid);

-- Game Sessions tablosu için RLS politikaları (geçici olarak devre dışı)
-- CREATE POLICY "Users can view own game sessions" ON game_sessions
--     FOR SELECT USING (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- CREATE POLICY "Users can insert own game sessions" ON game_sessions
--     FOR INSERT WITH CHECK (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- CREATE POLICY "Users can update own game sessions" ON game_sessions
--     FOR UPDATE USING (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- Level Completions tablosu için RLS politikaları (geçici olarak devre dışı)
-- CREATE POLICY "Users can view own level completions" ON level_completions
--     FOR SELECT USING (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- CREATE POLICY "Users can insert own level completions" ON level_completions
--     FOR INSERT WITH CHECK (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- User Statistics tablosu için RLS politikaları (geçici olarak devre dışı)
-- CREATE POLICY "Users can view own statistics" ON user_statistics
--     FOR SELECT USING (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- CREATE POLICY "Users can update own statistics" ON user_statistics
--     FOR UPDATE USING (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- CREATE POLICY "Users can insert own statistics" ON user_statistics
--     FOR INSERT WITH CHECK (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- Leaderboard tablosu için RLS politikaları (geçici olarak devre dışı)
-- CREATE POLICY "Anyone can view leaderboard" ON leaderboard
--     FOR SELECT USING (true);

-- CREATE POLICY "Users can insert own leaderboard entries" ON leaderboard
--     FOR INSERT WITH CHECK (
--         user_id IN (
--             SELECT id FROM users WHERE firebase_uid = auth.uid()::text
--         )
--     );

-- Trigger'lar (Otomatik güncellemeler için)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları sadece yoksa oluştur
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_statistics_updated_at') THEN
        CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- User Statistics güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_statistics (user_id, total_games_played, total_levels_completed, total_play_time_seconds, total_moves, best_level_reached)
    VALUES (NEW.user_id, 1, 1, NEW.time_seconds, NEW.moves_count, NEW.level_number)
    ON CONFLICT (user_id) DO UPDATE SET
        total_games_played = user_statistics.total_games_played + 1,
        total_levels_completed = user_statistics.total_levels_completed + 1,
        total_play_time_seconds = user_statistics.total_play_time_seconds + NEW.time_seconds,
        total_moves = user_statistics.total_moves + NEW.moves_count,
        best_level_reached = GREATEST(user_statistics.best_level_reached, NEW.level_number),
        average_moves_per_level = (user_statistics.total_moves + NEW.moves_count)::DECIMAL / (user_statistics.total_levels_completed + 1),
        average_time_per_level = (user_statistics.total_play_time_seconds + NEW.time_seconds)::DECIMAL / (user_statistics.total_levels_completed + 1),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- User Statistics trigger'ını sadece yoksa oluştur
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_statistics_trigger') THEN
        CREATE TRIGGER update_user_statistics_trigger
            AFTER INSERT ON level_completions
            FOR EACH ROW EXECUTE FUNCTION update_user_statistics();
    END IF;
END $$;
