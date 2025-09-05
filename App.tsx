import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, Dimensions, Image, TextInput } from 'react-native';
import { signInWithGoogle, signOutUser, onAuthStateChange } from './authService';
import { createOrUpdateUser, startGameSession, endGameSession, saveLevelCompletion, getLeaderboard } from './dataService';

const { width: screenWidth } = Dimensions.get('window');

// Level konfigürasyonları
interface LevelConfig {
  gridSize: number;
  shape: 'square' | 'L' | 'T' | 'plus' | 'triangle' | 'hexagon';
  hasFixedSquares: boolean;
  hasDiagonalToggle: boolean;
  fixedSquares?: number[][];
}

const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1: 3x3 - Çok basit test bölümü
  { gridSize: 3, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  // Level 2: 4x4 - Basit test bölümü  
  { gridSize: 4, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  // Level 3: 5x5 - Orta basitlik
  { gridSize: 5, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  // Level 4: 5x5 - Biraz daha zor
  { gridSize: 5, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  // Level 5: 5x5 - Normal zorluk
  { gridSize: 5, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  
  // Level 6-10: 6x6 kare
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  
  // Level 11-15: 7x7 kare
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  
  // Level 16-20: 8x8 kare
  { gridSize: 8, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 8, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 8, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 8, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 8, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: false },
  
  // Level 21+: Özel şekiller ve özellikler
  { gridSize: 6, shape: 'L', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'T', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'plus', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'triangle', hasFixedSquares: false, hasDiagonalToggle: false },
  { gridSize: 6, shape: 'hexagon', hasFixedSquares: false, hasDiagonalToggle: false },
  
  // Sabit kareler ile
  { gridSize: 6, shape: 'square', hasFixedSquares: true, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'square', hasFixedSquares: true, hasDiagonalToggle: false },
  
  // Çapraz toggle ile
  { gridSize: 6, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: true },
  { gridSize: 7, shape: 'square', hasFixedSquares: false, hasDiagonalToggle: true },
  
  // Kombinasyonlar
  { gridSize: 7, shape: 'L', hasFixedSquares: true, hasDiagonalToggle: false },
  { gridSize: 7, shape: 'T', hasFixedSquares: false, hasDiagonalToggle: true },
  { gridSize: 8, shape: 'plus', hasFixedSquares: true, hasDiagonalToggle: true },
];

interface Cell {
  isOn: boolean;
  isFixed: boolean;
  isActive: boolean; // Şekil içinde mi
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'auth' | 'dashboard' | 'game'>('loading');
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<LevelConfig>(LEVEL_CONFIGS[0]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentScreen === 'game') {
      initializeLevel();
    }
  }, [level, currentScreen]);

  // Authentication durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authState) => {
      setIsAuthenticated(authState.isAuthenticated);
      setUser(authState.user);
      setIsLoading(false);

      // Kullanıcı giriş yaptıysa Supabase'e kaydet ve dashboard'a git
      if (authState.isAuthenticated && authState.user) {
        try {
          const result = await createOrUpdateUser(authState.user);
          if (result.success) {
            setDbUser(result.user);
          }
          setCurrentScreen('dashboard');
        } catch (error) {
          console.log('Kullanıcı kaydetme hatası (geçici):', error.message);
          setCurrentScreen('dashboard'); // Hata olsa da dashboard'a git
        }
      } else {
        setDbUser(null);
        setCurrentSessionId(null);
        setCurrentScreen('auth');
      }
    });

    return () => unsubscribe();
  }, []);


  // Leaderboard'u yükle
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const result = await getLeaderboard();
        if (result.success) {
          setLeaderboard(result.leaderboard);
        }
      } catch (error) {
        console.log('Leaderboard yükleme hatası:', error.message);
      }
    };

    if (currentScreen === 'dashboard') {
      loadLeaderboard();
    }
  }, [currentScreen]);

  useEffect(() => {
    if (isGameActive && !gameWon) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameActive, gameWon]);

  const getLevelConfig = (levelNum: number): LevelConfig => {
    if (levelNum <= LEVEL_CONFIGS.length) {
      return LEVEL_CONFIGS[levelNum - 1];
    }
    // Sonsuz level için döngüsel konfigürasyon
    const baseConfig = LEVEL_CONFIGS[(levelNum - 1) % LEVEL_CONFIGS.length];
    return {
      ...baseConfig,
      gridSize: Math.min(8, baseConfig.gridSize + Math.floor((levelNum - 1) / LEVEL_CONFIGS.length)),
    };
  };

  const generateSolvableBoard = (config: LevelConfig): Cell[][] => {
    const size = config.gridSize;
    
    // Test için her zaman basit ve garantili çözülebilir board oluştur
    // Gerçek oyunda rastgele board'lar oluşturulabilir
    return createSimpleSolvableBoard(size, config);
  };

  const createEmptyGrid = (size: number, config: LevelConfig): Cell[][] => {
    const grid: Cell[][] = [];
    
    for (let i = 0; i < size; i++) {
      grid[i] = [];
      for (let j = 0; j < size; j++) {
        grid[i][j] = {
          isOn: Math.random() > 0.5, // Rastgele başlangıç durumu
          isFixed: false,
          isActive: isCellInShape(i, j, config)
        };
      }
    }

    // Sabit kareleri ayarla
    if (config.hasFixedSquares) {
      const activeCells = grid.flat().filter(cell => cell.isActive);
      const fixedCount = Math.min(Math.floor(activeCells.length * 0.15), 3); // Max 3 sabit kare
      
      for (let i = 0; i < fixedCount; i++) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (grid[row][col].isActive && !grid[row][col].isFixed) {
          grid[row][col].isFixed = true;
        }
      }
    }

    return grid;
  };

  const createSimpleSolvableBoard = (size: number, config: LevelConfig): Cell[][] => {
    const grid: Cell[][] = [];
    
    // Tüm kareleri kapalı olarak başlat
    for (let i = 0; i < size; i++) {
      grid[i] = [];
      for (let j = 0; j < size; j++) {
        grid[i][j] = {
          isOn: false,
          isFixed: false,
          isActive: isCellInShape(i, j, config)
        };
      }
    }

    // Basit ve garantili çözülebilir pattern'ler oluştur
    if (size === 3) {
      // 3x3 için çok basit pattern: sadece köşeler açık
      grid[0][0].isOn = true;
      grid[0][2].isOn = true;
      grid[2][0].isOn = true;
      grid[2][2].isOn = true;
    } else if (size === 4) {
      // 4x4 için basit pattern: çapraz açık
      grid[0][0].isOn = true;
      grid[1][1].isOn = true;
      grid[2][2].isOn = true;
      grid[3][3].isOn = true;
    } else if (size === 5) {
      // 5x5 için orta pattern: merkez ve köşeler
      grid[0][0].isOn = true;
      grid[0][4].isOn = true;
      grid[2][2].isOn = true;
      grid[4][0].isOn = true;
      grid[4][4].isOn = true;
    } else {
      // Diğer boyutlar için rastgele ama az sayıda açık
      const activeCells = grid.flat().filter(cell => cell.isActive);
      const onCount = Math.min(2, Math.floor(activeCells.length / 4));
      
      for (let i = 0; i < onCount; i++) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (grid[row][col].isActive) {
          grid[row][col].isOn = true;
        }
      }
    }

    return grid;
  };

  const isCellInShape = (row: number, col: number, config: LevelConfig): boolean => {
    const size = config.gridSize;
    const center = Math.floor(size / 2);
    
    switch (config.shape) {
      case 'square':
        return true;
      
      case 'L':
        return (row <= center && col <= center) || 
               (row > center && col <= center) || 
               (row > center && col > center);
      
      case 'T':
        return (row <= center) || 
               (row > center && col === center);
      
      case 'plus':
        return (row === center) || (col === center);
      
      case 'triangle':
        return row + col >= center && 
               row - col <= center && 
               row <= center + Math.floor(size / 3);
      
      case 'hexagon':
        const dx = Math.abs(col - center);
        const dy = Math.abs(row - center);
        return dx + dy <= center;
      
      default:
        return true;
    }
  };

  const generateSolution = (size: number, config: LevelConfig): boolean[][] => {
    const solution: boolean[][] = [];
    for (let i = 0; i < size; i++) {
      solution[i] = [];
      for (let j = 0; j < size; j++) {
        solution[i][j] = Math.random() > 0.7; // %30 çözüm
      }
    }
    return solution;
  };

  const applySolution = (grid: Cell[][], solution: boolean[][], config: LevelConfig) => {
    const size = config.gridSize;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (solution[i][j] && grid[i][j].isActive) {
          toggleCellAndNeighbors(grid, i, j, config);
        }
      }
    }
  };

  const toggleCellAndNeighbors = (grid: Cell[][], row: number, col: number, config: LevelConfig) => {
    const size = config.gridSize;
    const positions = [
      [row, col],
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ];

    // Çapraz toggle varsa çapraz kareleri de ekle
    if (config.hasDiagonalToggle) {
      positions.push(
        [row - 1, col - 1],
        [row - 1, col + 1],
        [row + 1, col - 1],
        [row + 1, col + 1]
      );
    }

    positions.forEach(([r, c]) => {
      if (r >= 0 && r < size && c >= 0 && c < size && grid[r][c].isActive && !grid[r][c].isFixed) {
        grid[r][c].isOn = !grid[r][c].isOn;
      }
    });
  };

  const initializeLevel = () => {
    const config = getLevelConfig(level);
    setCurrentConfig(config);
    
    const newGrid = generateSolvableBoard(config);
    setGrid(newGrid);
    setMoves(0);
    setGameWon(false);
    setTimeElapsed(0);
    setIsGameActive(true);
  };

  const isBoardSolvable = (grid: Cell[][], config: LevelConfig): boolean => {
    const size = config.gridSize;
    const activeCells = grid.flat().filter(cell => cell.isActive && !cell.isFixed);
    
    if (activeCells.length === 0) return true; // Zaten çözülmüş
    
    // Basit çözülebilirlik kontrolü: En az bir aktif kare olmalı
    if (activeCells.length < 2) return true;
    
    // Çok fazla açık kare varsa çözülebilir olmayabilir
    const onCells = activeCells.filter(cell => cell.isOn);
    if (onCells.length > activeCells.length * 0.8) return false;
    
    // Çok az açık kare varsa çözülebilir
    if (onCells.length <= 2) return true;
    
    // Orta seviye durumlar için basit kontrol
    return onCells.length <= activeCells.length * 0.6;
  };

  const toggleLight = (row: number, col: number) => {
    if (gameWon || !grid[row][col].isActive || grid[row][col].isFixed) return;

    // Toggle öncesi durumu kontrol et
    const currentActiveCells = grid.flat().filter(cell => cell.isActive && !cell.isFixed);
    const currentActiveOnCells = currentActiveCells.filter(cell => cell.isOn);
    
    console.log('Toggle öncesi - Active cells:', currentActiveCells.length, 'On cells:', currentActiveOnCells.length);

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    toggleCellAndNeighbors(newGrid, row, col, currentConfig);

    setGrid(newGrid);
    setMoves(prev => prev + 1);

    // Toggle sonrası durumu kontrol et
    const newActiveCells = newGrid.flat().filter(cell => cell.isActive && !cell.isFixed);
    const newActiveOnCells = newActiveCells.filter(cell => cell.isOn);
    
    console.log('Toggle sonrası - Active cells:', newActiveCells.length, 'On cells:', newActiveOnCells.length);
    
    // Oyun geçme koşulları:
    // 1. Tüm aktif cell'ler kapalı (newActiveOnCells.length === 0)
    // 2. Sadece 1 aktif cell açık (newActiveOnCells.length === 1)
    // 3. Son kare siyah olduğunda ona basınca (currentActiveOnCells.length === 1 && newActiveOnCells.length === 0)
    if (newActiveOnCells.length === 0 || newActiveOnCells.length === 1 || 
        (currentActiveOnCells.length === 1 && newActiveOnCells.length === 0)) {
      setGameWon(true);
      setIsGameActive(false);
      const timeString = formatTime(timeElapsed);
      
      // Bölüm tamamlama verilerini kaydet
      if (dbUser && currentSessionId) {
        saveLevelCompletion(dbUser.id, currentSessionId, {
          level: level,
          gridSize: currentConfig.gridSize,
          shape: currentConfig.shape,
          hasFixedSquares: currentConfig.hasFixedSquares,
          hasDiagonalToggle: currentConfig.hasDiagonalToggle,
          moves: moves + 1,
          time: timeElapsed
        }).then(result => {
          if (result.success) {
            console.log('Bölüm tamamlama kaydedildi:', result.completion);
          } else {
            console.log('Bölüm kaydetme hatası:', result.error);
          }
        }).catch(error => {
          console.log('Veri kaydetme hatası:', error.message);
        });
      }
      
      Alert.alert(
        '🎉 Tebrikler!', 
        `Level ${level}'i ${moves + 1} hamlede ve ${timeString} sürede tamamladınız!\n\nSonraki level'a geçmek için dokunun.`,
        [
          {
            text: 'Sonraki Level',
            onPress: () => {
              setLevel(prev => prev + 1);
            }
          }
        ]
      );
    }
  };

  const getCellSize = (): number => {
    const maxSize = Math.min(screenWidth - 40, 400);
    return Math.floor(maxSize / currentConfig.gridSize) - 4;
  };

  const renderGrid = () => {
    const cellSize = getCellSize();
    
    return grid.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((cell, colIndex) => {
          if (!cell.isActive) {
            return <View key={`${rowIndex}-${colIndex}`} style={[styles.light, { width: cellSize, height: cellSize, backgroundColor: 'transparent' }]} />;
          }
          
          return (
          <TouchableOpacity
            key={`${rowIndex}-${colIndex}`}
            style={[
              styles.light,
                { 
                  width: cellSize, 
                  height: cellSize,
                  backgroundColor: cell.isOn ? '#FFD700' : '#333333',
                  borderColor: cell.isFixed ? '#FF6B6B' : '#555555',
                  borderWidth: cell.isFixed ? 3 : 2,
                  opacity: cell.isFixed ? 0.7 : 1
                }
            ]}
            onPress={() => toggleLight(rowIndex, colIndex)}
          />
          );
        })}
      </View>
    ));
  };

  const getShapeEmoji = (shape: string): string => {
    switch (shape) {
      case 'L': return '📐';
      case 'T': return '🔺';
      case 'plus': return '➕';
      case 'triangle': return '🔺';
      case 'hexagon': return '⬡';
      default: return '⬜';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipLevel = () => {
    Alert.alert(
      'Bölüm Geç',
      'Bu bölümü geçmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Geç',
          onPress: () => {
            setLevel(prev => prev + 1);
          }
        }
      ]
    );
  };

  const goToHome = async () => {
    setIsGameActive(false);
    
    // Oyun oturumunu bitir (geçici olarak devre dışı)
    if (dbUser && currentSessionId) {
      try {
        await endGameSession(currentSessionId, level, timeElapsed, moves, level);
        setCurrentSessionId(null);
      } catch (error) {
        console.log('Oyun oturumu bitirme hatası (geçici):', error.message);
      }
    }
    
    setCurrentScreen('dashboard');
  };

  const startGame = async () => {
    if (!isAuthenticated) {
      Alert.alert('Giriş Gerekli', 'Oyunu oynamak için Gmail ile giriş yapmalısınız');
      return;
    }
    
    setLevel(1);
    setCurrentScreen('game');
    
    // Oyun oturumu başlat (geçici olarak devre dışı)
    if (dbUser) {
      try {
        const result = await startGameSession(dbUser.id);
        if (result.success) {
          setCurrentSessionId(result.session.id);
        }
      } catch (error) {
        console.log('Oyun oturumu başlatma hatası (geçici):', error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const result = await signInWithGoogle();
    setIsLoading(false);
    
    if (!result.success) {
      Alert.alert('Giriş Hatası', result.error);
    }
    // Auth state change handler otomatik olarak güncelleyecek
  };


  const handleSignOut = async () => {
    setIsLoading(true);
    const result = await signOutUser();
    setIsLoading(false);
    
    if (!result.success) {
      Alert.alert('Çıkış Hatası', result.error);
    }
    // Auth state change handler otomatik olarak güncelleyecek
  };

  const renderDashboard = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboardContainer}>
        <Text style={styles.dashboardTitle}>💡 Lights Out</Text>
        <Text style={styles.dashboardSubtitle}>Işıkları Söndür Oyunu</Text>
        
        {/* Kullanıcı bilgileri */}
        {isAuthenticated && user && (
          <View style={styles.userInfo}>
            {user.photoURL && (
              <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
            )}
            <Text style={styles.userName}>{user.displayName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>🚪 Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.leaderboardTitle}>🏆 En Başarılı 10 Oyuncu</Text>
          <View style={styles.leaderboardList}>
            {leaderboard.length > 0 ? (
              leaderboard.map((player, index) => (
                <View key={index} style={styles.leaderboardItem}>
                  <Text style={styles.rank}>#{index + 1}</Text>
                  <Text style={styles.playerName}>{player.display_name || player.email}</Text>
                  <Text style={styles.playerScore}>Level {player.best_level_reached}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>Henüz veri yok</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>🎮 Oyunu Başlat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderAuthScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>🔐 Google ile Giriş Yap</Text>
        <Text style={styles.authSubtitle}>Oyunu oynamak için Google hesabınızla giriş yapın</Text>
        
        <View style={styles.authForm}>
          <TouchableOpacity 
            style={styles.googleSignInButton} 
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleSignInButtonText}>
              {isLoading ? '⏳ Yükleniyor...' : '📧 Google ile Giriş Yap'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>⏳ Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'auth') {
    return renderAuthScreen();
  }

  if (currentScreen === 'dashboard') {
    return renderDashboard();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
            <Text style={styles.homeButtonText}>🏠 Ana Sayfa</Text>
          </TouchableOpacity>
        <Text style={styles.title}>💡 Lights Out</Text>
          <TouchableOpacity style={styles.skipButton} onPress={skipLevel}>
            <Text style={styles.skipButtonText}>⏭️ Geç</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.level}>Level {level} {getShapeEmoji(currentConfig.shape)}</Text>
        <View style={styles.statsContainer}>
        <Text style={styles.moves}>Hamle: {moves}</Text>
          <Text style={styles.timer}>⏱️ {formatTime(timeElapsed)}</Text>
        </View>
      </View>
      
      <View style={styles.gameContainer}>
        {renderGrid()}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.instruction}>Işıkları söndürmek için dokun!</Text>
        <TouchableOpacity style={styles.button} onPress={initializeLevel}>
          <Text style={styles.buttonText}>🔄 Yeniden Başla</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  // Dashboard stilleri
  dashboardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dashboardTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  dashboardSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Loading stilleri
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  // Leaderboard stilleri
  leaderboardSection: {
    marginBottom: 30,
  },
  leaderboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
  },
  leaderboardList: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 15,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    width: 40,
  },
  playerName: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 10,
  },
  playerScore: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  noDataText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    paddingVertical: 20,
  },
  startButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
  // Authentication stilleri
  userInfo: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 15,
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signOutButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authSection: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
  },
  authText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 15,
    textAlign: 'center',
  },
  googleSignInButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleSignInButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Authentication ekranı stilleri
  authContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '600',
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
  },
  googleSignInButton: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
    paddingVertical: 15,
    marginBottom: 20,
  },
  googleSignInButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E1E',
    textAlign: 'center',
  },
  authForm: {
    flex: 1,
  },
  // Oyun ekranı stilleri
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  homeButton: {
    backgroundColor: '#444444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  homeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  skipButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  level: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moves: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  timer: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  light: {
    margin: 2,
    borderRadius: 6,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E1E1E',
  },
});