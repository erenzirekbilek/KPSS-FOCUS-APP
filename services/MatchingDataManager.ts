// services/MatchingDataManager.ts

import * as SQLite from "expo-sqlite";
import matchingRaw from "../assets/data/matching-data.json";

const DATABASE_NAME = "kpss_focus_v11.db"; // mevcut DB ile aynı dosya

// ─── Tipler ───────────────────────────────────────────────────────────────────

export type MatchingType =
  | "olay_tarih" // Olay ↔ Tarih
  | "kisi_olay" // Kişi ↔ Olayı
  | "kavram_tanim" // Kavram ↔ Tanım
  | "donem_ozellik"; // Dönem ↔ Özellik

export interface MatchingPair {
  id: number;
  category: string;
  subcategory: string;
  type: MatchingType;
  left: string;
  right: string;
}

export interface MatchingSession {
  sessionId: number;
  category: string | null; // null = tümü/karışık
  type: MatchingType | null; // null = tüm tipler
  totalPairs: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  completedAt: string | null;
  createdAt: string;
}

export interface MatchingStats {
  totalSessions: number;
  completedSessions: number;
  totalCorrect: number;
  totalWrong: number;
  bestScore: number; // tek seferde en yüksek doğru sayısı
  avgAccuracy: number; // genel doğruluk yüzdesi (0-100)
  avgDurationSeconds: number;
  categoryStats: {
    category: string;
    sessions: number;
    correct: number;
    wrong: number;
    accuracy: number;
  }[];
  typeStats: {
    type: MatchingType;
    label: string;
    sessions: number;
    correct: number;
    wrong: number;
    accuracy: number;
  }[];
  recentSessions: MatchingSession[];
  dailyActivity: { date: string; count: number }[];
}

export interface CategorySummary {
  category: string;
  totalPairs: number;
  sessions: number;
  bestAccuracy: number; // 0-100
}

export const MATCHING_TYPE_LABELS: Record<MatchingType, string> = {
  olay_tarih: "Olay ↔ Tarih",
  kisi_olay: "Kişi ↔ Olayı",
  kavram_tanim: "Kavram ↔ Tanım",
  donem_ozellik: "Dönem ↔ Özellik",
};

// ─── Manager Sınıfı ───────────────────────────────────────────────────────────

class MatchingDataManager {
  private static instance: MatchingDataManager | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): MatchingDataManager {
    if (!MatchingDataManager.instance) {
      MatchingDataManager.instance = new MatchingDataManager();
    }
    return MatchingDataManager.instance;
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await this.db.runAsync("PRAGMA journal_mode = WAL");
      await this.db.runAsync("PRAGMA busy_timeout = 10000");
      await this.db.runAsync("PRAGMA synchronous = NORMAL");
      await this.db.runAsync("PRAGMA cache_size = 10000");
      await this._createTables();
      await this._seedData();
      console.log("MatchingDataManager: Hazır.");
    } catch (error) {
      console.error("MatchingDataManager: Başlatma hatası:", error);
      this.initPromise = null;
      this.db = null;
      throw error;
    }
  }

  private async _ensureInitialized(): Promise<void> {
    if (!this.db || !this.initPromise) {
      await this.initialize();
    } else {
      await this.initPromise;
    }
  }

  // ── Tablo Oluşturma ─────────────────────────────────────────────────────────

  private async _createTables(): Promise<void> {
    if (!this.db) return;

    // Eşleştirme çiftleri — JSON'dan seed edilir, salt okunur
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS matching_pairs (
        id          INTEGER PRIMARY KEY,
        category    TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        type        TEXT NOT NULL,
        left_text   TEXT NOT NULL,
        right_text  TEXT NOT NULL
      )
    `);

    // Her oyun oturumu — bir oturum = bir tur oyun
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS matching_sessions (
        sessionId       INTEGER PRIMARY KEY AUTOINCREMENT,
        category        TEXT,
        type            TEXT,
        totalPairs      INTEGER NOT NULL DEFAULT 0,
        correctCount    INTEGER NOT NULL DEFAULT 0,
        wrongCount      INTEGER NOT NULL DEFAULT 0,
        durationSeconds INTEGER NOT NULL DEFAULT 0,
        completedAt     DATETIME,
        createdAt       DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // meta tablosu database.ts'te zaten var ama IF NOT EXISTS ile güvenli
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  // ── Seed ────────────────────────────────────────────────────────────────────

  private async _seedData(): Promise<void> {
    if (!this.db) return;

    const seedDone = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'matching_seed_done'",
    );
    if (seedDone?.value === "1") {
      console.log("MatchingDataManager: Seed zaten tamamlanmış, atlanıyor.");
      return;
    }

    // Yarım kalan seed varsa temizle
    await this.db.runAsync("DELETE FROM matching_pairs");

    try {
      const pairs = matchingRaw as MatchingPair[];
      const CHUNK = 100;
      let inserted = 0;

      for (let i = 0; i < pairs.length; i += CHUNK) {
        const chunk = pairs.slice(i, i + CHUNK);

        await this.db.runAsync("BEGIN");
        try {
          for (const p of chunk) {
            if (!p.left?.trim() || !p.right?.trim()) continue;
            await this.db.runAsync(
              `INSERT OR IGNORE INTO matching_pairs
               (id, category, subcategory, type, left_text, right_text)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                p.id,
                p.category,
                p.subcategory,
                p.type,
                p.left.trim(),
                p.right.trim(),
              ],
            );
            inserted++;
          }
          await this.db.runAsync("COMMIT");
        } catch (err) {
          await this.db.runAsync("ROLLBACK");
          throw err;
        }

        console.log(
          `MatchingDataManager: ${inserted}/${pairs.length} çift eklendi.`,
        );
      }

      await this.db.runAsync(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('matching_seed_done', '1')",
      );
      console.log(
        `MatchingDataManager: Seed tamamlandı. ${inserted} çift eklendi.`,
      );
    } catch (error) {
      console.error("MatchingDataManager: Seed başarısız:", error);
      await this.db.runAsync("DELETE FROM matching_pairs");
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API — Çift Sorgulama
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Oyun için rastgele eşleştirme çiftleri getirir.
   * @param count     Kaç çift istendiği (varsayılan: 6)
   * @param category  Belirli bir kategori (null = tümünden karışık)
   * @param type      Belirli bir tip (null = tüm tipler)
   */
  async getRandomPairs(
    count: number = 6,
    category: string | null = null,
    type: MatchingType | null = null,
  ): Promise<MatchingPair[]> {
    await this._ensureInitialized();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await this.db!.getAllAsync<any>(
      `SELECT id, category, subcategory, type, left_text, right_text
       FROM matching_pairs
       ${where}
       ORDER BY RANDOM()
       LIMIT ?`,
      [...params, count],
    );

    return rows.map(this._rowToPair);
  }

  /**
   * Belirli ID'lere göre çiftleri getirir (özelleştirilmiş tur için).
   */
  async getPairsByIds(ids: number[]): Promise<MatchingPair[]> {
    await this._ensureInitialized();
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => "?").join(",");
    const rows = await this.db!.getAllAsync<any>(
      `SELECT id, category, subcategory, type, left_text, right_text
       FROM matching_pairs WHERE id IN (${placeholders})`,
      ids,
    );
    return rows.map(this._rowToPair);
  }

  /**
   * Tüm benzersiz kategorilerin özetini döndürür.
   */
  async getCategorySummaries(): Promise<CategorySummary[]> {
    await this._ensureInitialized();

    // Tüm kategoriler ve çift sayıları
    const pairCounts = await this.db!.getAllAsync<{
      category: string;
      totalPairs: number;
    }>(
      `SELECT category, COUNT(*) as totalPairs
       FROM matching_pairs
       GROUP BY category
       ORDER BY category ASC`,
    );

    // Her kategorinin oturum istatistikleri
    const sessionStats = await this.db!.getAllAsync<{
      category: string;
      sessions: number;
      bestAccuracy: number;
    }>(
      `SELECT
         category,
         COUNT(*) as sessions,
         MAX(CASE WHEN totalPairs > 0
               THEN ROUND(correctCount * 100.0 / totalPairs)
               ELSE 0
             END) as bestAccuracy
       FROM matching_sessions
       WHERE category IS NOT NULL AND completedAt IS NOT NULL
       GROUP BY category`,
    );

    const sessionMap = new Map(sessionStats.map((s) => [s.category, s]));

    return pairCounts.map((p) => {
      const s = sessionMap.get(p.category);
      return {
        category: p.category,
        totalPairs: p.totalPairs,
        sessions: s?.sessions ?? 0,
        bestAccuracy: s?.bestAccuracy ?? 0,
      };
    });
  }

  /**
   * Tüm kategorilerin isim listesini döndürür.
   */
  async getCategories(): Promise<string[]> {
    await this._ensureInitialized();
    const rows = await this.db!.getAllAsync<{ category: string }>(
      "SELECT DISTINCT category FROM matching_pairs ORDER BY category ASC",
    );
    return rows.map((r) => r.category);
  }

  /**
   * Bir kategoride kaç çift olduğunu döndürür.
   */
  async getPairCount(
    category: string | null = null,
    type: MatchingType | null = null,
  ): Promise<number> {
    await this._ensureInitialized();

    const conditions: string[] = [];
    const params: string[] = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const row = await this.db!.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM matching_pairs ${where}`,
      params,
    );
    return row?.cnt ?? 0;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API — Oturum Kayıt & Sorgulama
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Yeni bir oyun oturumu başlatır; sessionId döndürür.
   */
  async startSession(
    totalPairs: number,
    category: string | null = null,
    type: MatchingType | null = null,
  ): Promise<number> {
    await this._ensureInitialized();

    const result = await this.db!.runAsync(
      `INSERT INTO matching_sessions
       (category, type, totalPairs, correctCount, wrongCount, durationSeconds)
       VALUES (?, ?, ?, 0, 0, 0)`,
      [category, type, totalPairs],
    );
    return result.lastInsertRowId;
  }

  /**
   * Oturum süresince anlık ilerlemeyi günceller.
   * Her doğru/yanlış eşleştirmede çağrılabilir.
   */
  async updateSession(
    sessionId: number,
    correctCount: number,
    wrongCount: number,
    durationSeconds: number,
  ): Promise<void> {
    await this._ensureInitialized();
    try {
      await this.db!.runAsync(
        `UPDATE matching_sessions
         SET correctCount = ?, wrongCount = ?, durationSeconds = ?
         WHERE sessionId = ?`,
        [correctCount, wrongCount, durationSeconds, sessionId],
      );
    } catch (error) {
      console.error("MatchingDataManager: Oturum güncellenemedi:", error);
    }
  }

  /**
   * Oturumu tamamlandı olarak işaretler.
   */
  async completeSession(
    sessionId: number,
    correctCount: number,
    wrongCount: number,
    durationSeconds: number,
  ): Promise<void> {
    await this._ensureInitialized();
    try {
      await this.db!.runAsync(
        `UPDATE matching_sessions
         SET correctCount = ?,
             wrongCount = ?,
             durationSeconds = ?,
             completedAt = CURRENT_TIMESTAMP
         WHERE sessionId = ?`,
        [correctCount, wrongCount, durationSeconds, sessionId],
      );
    } catch (error) {
      console.error("MatchingDataManager: Oturum tamamlanamadı:", error);
    }
  }

  /**
   * Yarıda bırakılan (completedAt NULL) oturumları siler.
   * Uygulama açılışında çağrılabilir.
   */
  async cleanupIncompleteSessions(): Promise<void> {
    await this._ensureInitialized();
    await this.db!.runAsync(
      "DELETE FROM matching_sessions WHERE completedAt IS NULL",
    );
  }

  /**
   * Belirli bir oturumun detayını döndürür.
   */
  async getSession(sessionId: number): Promise<MatchingSession | null> {
    await this._ensureInitialized();
    const row = await this.db!.getFirstAsync<any>(
      "SELECT * FROM matching_sessions WHERE sessionId = ?",
      [sessionId],
    );
    return row ? this._rowToSession(row) : null;
  }

  /**
   * Son N oturumu döndürür (varsayılan: 10).
   */
  async getRecentSessions(limit: number = 10): Promise<MatchingSession[]> {
    await this._ensureInitialized();
    const rows = await this.db!.getAllAsync<any>(
      `SELECT * FROM matching_sessions
       WHERE completedAt IS NOT NULL
       ORDER BY completedAt DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map(this._rowToSession);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API — İstatistikler
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Tüm eşleştirme oyunu istatistiklerini tek seferde döndürür.
   */
  async getStats(): Promise<MatchingStats> {
    await this._ensureInitialized();

    try {
      // Genel toplamlar
      const totals = await this.db!.getFirstAsync<{
        totalSessions: number;
        completedSessions: number;
        totalCorrect: number;
        totalWrong: number;
        bestScore: number;
        avgDuration: number;
      }>(
        `SELECT
           COUNT(*)                                          as totalSessions,
           SUM(CASE WHEN completedAt IS NOT NULL THEN 1 ELSE 0 END) as completedSessions,
           COALESCE(SUM(correctCount), 0)                   as totalCorrect,
           COALESCE(SUM(wrongCount), 0)                     as totalWrong,
           COALESCE(MAX(correctCount), 0)                   as bestScore,
           COALESCE(AVG(CASE WHEN completedAt IS NOT NULL
                              THEN durationSeconds END), 0) as avgDuration
         FROM matching_sessions`,
      );

      const totalAnswered =
        (totals?.totalCorrect ?? 0) + (totals?.totalWrong ?? 0);
      const avgAccuracy =
        totalAnswered > 0
          ? Math.round(((totals?.totalCorrect ?? 0) / totalAnswered) * 100)
          : 0;

      // Kategori bazlı istatistikler
      const categoryRows = await this.db!.getAllAsync<{
        category: string;
        sessions: number;
        correct: number;
        wrong: number;
      }>(
        `SELECT
           category,
           COUNT(*)                        as sessions,
           COALESCE(SUM(correctCount), 0)  as correct,
           COALESCE(SUM(wrongCount), 0)    as wrong
         FROM matching_sessions
         WHERE category IS NOT NULL AND completedAt IS NOT NULL
         GROUP BY category
         ORDER BY sessions DESC`,
      );

      const categoryStats = categoryRows.map((r) => {
        const total = r.correct + r.wrong;
        return {
          category: r.category,
          sessions: r.sessions,
          correct: r.correct,
          wrong: r.wrong,
          accuracy: total > 0 ? Math.round((r.correct / total) * 100) : 0,
        };
      });

      // Tip bazlı istatistikler
      const typeRows = await this.db!.getAllAsync<{
        type: string;
        sessions: number;
        correct: number;
        wrong: number;
      }>(
        `SELECT
           type,
           COUNT(*)                        as sessions,
           COALESCE(SUM(correctCount), 0)  as correct,
           COALESCE(SUM(wrongCount), 0)    as wrong
         FROM matching_sessions
         WHERE type IS NOT NULL AND completedAt IS NOT NULL
         GROUP BY type
         ORDER BY sessions DESC`,
      );

      const typeStats = typeRows.map((r) => {
        const total = r.correct + r.wrong;
        return {
          type: r.type as MatchingType,
          label: MATCHING_TYPE_LABELS[r.type as MatchingType] ?? r.type,
          sessions: r.sessions,
          correct: r.correct,
          wrong: r.wrong,
          accuracy: total > 0 ? Math.round((r.correct / total) * 100) : 0,
        };
      });

      // Son 10 oturum
      const recentSessions = await this.getRecentSessions(10);

      // Son 21 günlük aktivite
      const dailyActivity = await this.db!.getAllAsync<{
        date: string;
        count: number;
      }>(
        `SELECT
           DATE(completedAt)         as date,
           COUNT(*)                  as count
         FROM matching_sessions
         WHERE completedAt IS NOT NULL
           AND completedAt >= DATE('now', '-21 days')
         GROUP BY DATE(completedAt)
         ORDER BY date ASC`,
      );

      return {
        totalSessions: totals?.totalSessions ?? 0,
        completedSessions: totals?.completedSessions ?? 0,
        totalCorrect: totals?.totalCorrect ?? 0,
        totalWrong: totals?.totalWrong ?? 0,
        bestScore: totals?.bestScore ?? 0,
        avgAccuracy,
        avgDurationSeconds: Math.round(totals?.avgDuration ?? 0),
        categoryStats,
        typeStats,
        recentSessions,
        dailyActivity,
      };
    } catch (error) {
      console.error("MatchingDataManager: İstatistik alınamadı:", error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalCorrect: 0,
        totalWrong: 0,
        bestScore: 0,
        avgAccuracy: 0,
        avgDurationSeconds: 0,
        categoryStats: [],
        typeStats: [],
        recentSessions: [],
        dailyActivity: [],
      };
    }
  }

  /**
   * Belirli bir kategorideki en iyi doğruluk yüzdesini döndürür.
   */
  async getBestAccuracy(
    category: string | null = null,
    type: MatchingType | null = null,
  ): Promise<number> {
    await this._ensureInitialized();

    const conditions = ["completedAt IS NOT NULL", "totalPairs > 0"];
    const params: string[] = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    const row = await this.db!.getFirstAsync<{ best: number }>(
      `SELECT MAX(ROUND(correctCount * 100.0 / totalPairs)) as best
       FROM matching_sessions
       WHERE ${conditions.join(" AND ")}`,
      params,
    );
    return row?.best ?? 0;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API — Yardımcılar
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Sağ taraftaki seçenekleri karıştırarak döndürür (oyun ekranı için).
   * Sol listesi orijinal sırada, sağ listesi karışık döner.
   */
  shuffleOptions(pairs: MatchingPair[]): {
    leftItems: { id: number; text: string }[];
    rightItems: { id: number; text: string }[];
  } {
    const leftItems = pairs.map((p) => ({ id: p.id, text: p.left }));
    const rightItems = [...pairs]
      .sort(() => Math.random() - 0.5)
      .map((p) => ({ id: p.id, text: p.right }));
    return { leftItems, rightItems };
  }

  /**
   * Tüm eşleştirme verilerini sıfırlar (geliştirme/debug için).
   */
  async resetAllData(): Promise<void> {
    await this._ensureInitialized();
    await this.db!.runAsync("DELETE FROM matching_sessions");
    console.log("MatchingDataManager: Tüm oturumlar silindi.");
  }

  /**
   * Seed'i sıfırlar — bir sonraki açılışta yeniden seed edilir.
   * (Veri güncellemesi gerektiğinde kullanılır.)
   */
  async resetSeed(): Promise<void> {
    await this._ensureInitialized();
    await this.db!.runAsync(
      "DELETE FROM meta WHERE key = 'matching_seed_done'",
    );
    await this.db!.runAsync("DELETE FROM matching_pairs");
    this.initPromise = null;
    this.db = null;
    console.log("MatchingDataManager: Seed sıfırlandı.");
  }

  // ── Private yardımcılar ─────────────────────────────────────────────────────

  private _rowToPair(row: any): MatchingPair {
    return {
      id: row.id,
      category: row.category,
      subcategory: row.subcategory,
      type: row.type as MatchingType,
      left: row.left_text,
      right: row.right_text,
    };
  }

  private _rowToSession(row: any): MatchingSession {
    return {
      sessionId: row.sessionId,
      category: row.category,
      type: row.type as MatchingType | null,
      totalPairs: row.totalPairs,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      durationSeconds: row.durationSeconds,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const matchingDB = MatchingDataManager.getInstance();
