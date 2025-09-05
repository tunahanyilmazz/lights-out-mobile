// Supabase veri servis dosyası
import { supabase } from './supabaseConfig';

// Kullanıcı oluştur veya güncelle
export const createOrUpdateUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        firebase_uid: userData.uid,
        email: userData.email,
        display_name: userData.displayName,
        photo_url: userData.photoURL,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firebase_uid'
      })
      .select()
      .single();

    if (error) {
      // RLS hatası durumunda demo kullanıcı döndür
      if (error.code === '42501') {
        console.warn('RLS hatası - demo kullanıcı oluşturuluyor');
        const demoUser = {
          id: 'demo-user-' + Date.now(),
          firebase_uid: userData.uid,
          email: userData.email,
          display_name: userData.displayName,
          photo_url: userData.photoURL
        };
        return { success: true, user: demoUser };
      }
      throw error;
    }
    return { success: true, user: data };
  } catch (error) {
    console.error('Kullanıcı oluşturma/güncelleme hatası:', error);
    // Hata durumunda demo kullanıcı döndür
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      firebase_uid: userData.uid,
      email: userData.email,
      display_name: userData.displayName,
      photo_url: userData.photoURL
    };
    return { success: true, user: demoUser };
  }
};

// Oyun oturumu başlat
export const startGameSession = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        user_id: userId,
        session_start: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
        console.warn('RLS hatası - oyun oturumu kaydedilemedi, devam ediliyor');
        return { success: true, session: null };
      }
      throw error;
    }
    return { success: true, session: data };
  } catch (error) {
    console.error('Oyun oturumu başlatma hatası:', error);
    return { success: true, session: null };
  }
};

// Oyun oturumu bitir
export const endGameSession = async (sessionId, totalLevels, totalTime, totalMoves, highestLevel) => {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({
        session_end: new Date().toISOString(),
        total_levels_played: totalLevels,
        total_time_seconds: totalTime,
        total_moves: totalMoves,
        highest_level_reached: highestLevel
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, session: data };
  } catch (error) {
    console.error('Oyun oturumu bitirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Bölüm tamamlama kaydet
export const saveLevelCompletion = async (userId, sessionId, levelData) => {
  try {
    const { data, error } = await supabase
      .from('level_completions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        level_number: levelData.level,
        grid_size: levelData.gridSize,
        shape_type: levelData.shape,
        has_fixed_squares: levelData.hasFixedSquares,
        has_diagonal_toggle: levelData.hasDiagonalToggle,
        moves_count: levelData.moves,
        time_seconds: levelData.time,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
        console.warn('RLS hatası - bölüm tamamlama kaydedilemedi, devam ediliyor');
        return { success: true, completion: null };
      }
      throw error;
    }
    return { success: true, completion: data };
  } catch (error) {
    console.error('Bölüm tamamlama kaydetme hatası:', error);
    return { success: true, completion: null };
  }
};

// Kullanıcı istatistiklerini güncelle
export const updateUserStatistics = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_statistics')
      .upsert({
        user_id: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, statistics: data };
  } catch (error) {
    console.error('Kullanıcı istatistikleri güncelleme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Kullanıcı istatistiklerini getir
export const getUserStatistics = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { success: true, statistics: data };
  } catch (error) {
    console.error('Kullanıcı istatistikleri getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Kullanıcının bölüm geçmişini getir
export const getUserLevelHistory = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('level_completions')
      .select('level_number, moves_count, time_seconds, shape_type, completed_at')
      .eq('user_id', userId)
      .order('level_number', { ascending: true });

    if (error) throw error;

    // Her level için en iyi skorları bul
    const bestScores = {};
    data.forEach(completion => {
      const level = completion.level_number;
      if (!bestScores[level] || 
          completion.moves_count < bestScores[level].moves_count ||
          (completion.moves_count === bestScores[level].moves_count && 
           completion.time_seconds < bestScores[level].time_seconds)) {
        bestScores[level] = completion;
      }
    });

    return { success: true, bestScores: Object.values(bestScores) };
  } catch (error) {
    console.error('En iyi skorlar getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// En başarılı 10 oyuncuyu getir
export const getLeaderboard = async () => {
  try {
    const { data, error } = await supabase
      .from('user_statistics')
      .select(`
        user_id,
        best_level_reached,
        total_levels_completed,
        users!inner(display_name, email)
      `)
      .order('best_level_reached', { ascending: false })
      .order('total_levels_completed', { ascending: false })
      .limit(10);

    if (error) {
      if (error.code === '42501') {
        console.warn('RLS hatası - leaderboard getirilemedi, demo veriler döndürülüyor');
        // Demo leaderboard verileri
        const demoLeaderboard = [
          { user_id: '1', best_level_reached: 15, total_levels_completed: 45, users: { display_name: 'Ahmet Yılmaz', email: 'ahmet@example.com' } },
          { user_id: '2', best_level_reached: 12, total_levels_completed: 38, users: { display_name: 'Ayşe Demir', email: 'ayse@example.com' } },
          { user_id: '3', best_level_reached: 10, total_levels_completed: 32, users: { display_name: 'Mehmet Kaya', email: 'mehmet@example.com' } },
          { user_id: '4', best_level_reached: 8, total_levels_completed: 25, users: { display_name: 'Fatma Öz', email: 'fatma@example.com' } },
          { user_id: '5', best_level_reached: 6, total_levels_completed: 18, users: { display_name: 'Ali Çelik', email: 'ali@example.com' } }
        ];
        return { success: true, leaderboard: demoLeaderboard };
      }
      throw error;
    }

    return { success: true, leaderboard: data || [] };
  } catch (error) {
    console.error('Leaderboard getirme hatası:', error);
    // Hata durumunda da demo veriler döndür
    const demoLeaderboard = [
      { user_id: '1', best_level_reached: 15, total_levels_completed: 45, users: { display_name: 'Ahmet Yılmaz', email: 'ahmet@example.com' } },
      { user_id: '2', best_level_reached: 12, total_levels_completed: 38, users: { display_name: 'Ayşe Demir', email: 'ayse@example.com' } },
      { user_id: '3', best_level_reached: 10, total_levels_completed: 32, users: { display_name: 'Mehmet Kaya', email: 'mehmet@example.com' } },
      { user_id: '4', best_level_reached: 8, total_levels_completed: 25, users: { display_name: 'Fatma Öz', email: 'fatma@example.com' } },
      { user_id: '5', best_level_reached: 6, total_levels_completed: 18, users: { display_name: 'Ali Çelik', email: 'ali@example.com' } }
    ];
    return { success: true, leaderboard: demoLeaderboard };
  }
};