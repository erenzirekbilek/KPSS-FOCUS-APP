import * as SQLite from "expo-sqlite";
import truefalseData from "../assets/data/true-false.json";

const DATABASE_NAME = "true-false-db.db";

// ─── Interfaces ───────────────────────────────────────────────

export interface TrueFalseCard {
  id: number; // true_false_cards.id
  questionId: number; // true_false_questions.id
  question: string;
  category: string;
  correctAnswer: boolean;
  explanation: string;
  // SM-2
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
  totalCorrect: number;
  totalWrong: number;
}

export interface TrueFalseStats {
  totalCards: number;
  dueToday: number;
  mastered: number; // interval >= 21
  learning: number; // repetitions > 0 && interval < 21
  newCards: number; // repetitions === 0
  totalCorrect: number;
  totalWrong: number;
  successRate: number;
  categoryStats: {
    category: string;
    total: number;
    mastered: number;
    successRate: number;
  }[];
}

// ─── SM-2 Algoritması ─────────────────────────────────────────
// quality:
//   0 = tamamen yanlış
//   1 = yanlış ama mantıkla ulaşılabilir
//   2 = doğru ama zor
//   3 = doğru ve kolay
// UI'da sadece doğru/yanlış kullanıyorsan:
//   isCorrect=true  → quality=3
//   isCorrect=false → quality=0

interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

function sm2(
  quality: 0 | 1 | 2 | 3,
  easeFactor: number,
  interval: number,
  repetitions: number,
): SM2Result {
  let newEF =
    easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newRepetitions: number;

  if (quality < 2) {
    // Yanlış: sıfırla, yarın tekrar göster
    newInterval = 1;
    newRepetitions = 0;
  } else {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
  }

  const d = new Date();
  d.setDate(d.getDate() + newInterval);
  const nextReviewDate = d.toISOString().split("T")[0];

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── TrueFalseManager ─────────────────────────────────────────

class TrueFalseManager {
  private static instance: TrueFalseManager | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): TrueFalseManager {
    if (!TrueFalseManager.instance) {
      TrueFalseManager.instance = new TrueFalseManager();
    }
    return TrueFalseManager.instance;
  }

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
      await this.createTables();
      await this.syncCards();
      console.log("TrueFalse: Hazır.");
    } catch (err) {
      console.error("TrueFalse init hatası:", err);
      this.initPromise = null;
      this.db = null;
      throw err;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db || !this.initPromise) await this.initialize();
    else await this.initPromise;
  }

  // ─── Tablo Oluşturma ─────────────────────────────────────────

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS true_false_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sourceQuestionId INTEGER,
        question TEXT NOT NULL,
        category TEXT NOT NULL,
        correctAnswer INTEGER NOT NULL,
        explanation TEXT,
        UNIQUE(sourceQuestionId)
      )
    `);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS true_false_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        questionId INTEGER NOT NULL UNIQUE,
        easeFactor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        nextReviewDate TEXT DEFAULT '',
        lastReviewDate TEXT,
        totalCorrect INTEGER DEFAULT 0,
        totalWrong INTEGER DEFAULT 0,
        FOREIGN KEY (questionId) REFERENCES true_false_questions(id)
      )
    `);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS true_false_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  // ─── Seed: JSON'dan true_false_questions tablosunu doldur ─────

  private async syncCards(): Promise<void> {
    if (!this.db) return;

    const done = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM true_false_meta WHERE key = 'tf_synced'",
    );

    if (!done) {
      // JSON verisini düzleştir ve geçersizleri filtrele
      const flatData: any[] = (truefalseData as any)
        .flat(Infinity)
        .filter(
          (q: any) =>
            q &&
            q.question != null &&
            q.question !== "" &&
            q.category != null &&
            q.correctAnswer !== undefined &&
            q.correctAnswer !== null,
        );

      console.log(`TrueFalse: ${flatData.length} soru JSON'dan yüklenecek.`);

      if (flatData.length > 0) {
        const CHUNK_SIZE = 100;
        let inserted = 0;

        for (let i = 0; i < flatData.length; i += CHUNK_SIZE) {
          const chunk = flatData.slice(i, i + CHUNK_SIZE);

          await this.db.runAsync("BEGIN");
          try {
            for (const q of chunk) {
              const question = String(q.question ?? "").trim();
              const category = String(q.category ?? "").trim();
              const explanation = String(q.explanation ?? "").trim();

              // correctAnswer: boolean (true/false) veya string ("true"/"false") olabilir
              const correctAnswerRaw = q.correctAnswer;
              const boolVal =
                correctAnswerRaw === true ||
                correctAnswerRaw === "true" ||
                correctAnswerRaw === "True" ||
                correctAnswerRaw === 1 ||
                correctAnswerRaw === "1"
                  ? 1
                  : 0;

              if (!question || !category) continue;

              await this.db.runAsync(
                `INSERT OR IGNORE INTO true_false_questions
                 (sourceQuestionId, question, category, correctAnswer, explanation)
                 VALUES (?, ?, ?, ?, ?)`,
                [q.id ?? null, question, category, boolVal, explanation],
              );
              inserted++;
            }
            await this.db.runAsync("COMMIT");
          } catch (err) {
            await this.db.runAsync("ROLLBACK");
            throw err;
          }

          console.log(
            `TrueFalse: ${inserted}/${flatData.length} soru eklendi.`,
          );
        }
      }

      await this.db.runAsync(
        "INSERT OR REPLACE INTO true_false_meta (key, value) VALUES ('tf_synced', '1')",
      );
    }

    // Kartı olmayan sorular için SM-2 kartı oluştur
    await this.db.runAsync(`
      INSERT OR IGNORE INTO true_false_cards (questionId, nextReviewDate)
      SELECT id, date('now')
      FROM true_false_questions
      WHERE id NOT IN (SELECT questionId FROM true_false_cards)
    `);

    const count = await this.db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM true_false_cards",
    );
    console.log(`TrueFalse: ${count?.cnt ?? 0} kart hazır.`);
  }

  // ─── Kart Sorgulama ───────────────────────────────────────────

  /**
   * Bugün gösterilmesi gereken kartlar (vadesi geçmiş + bugün).
   */
  async getDueCards(limit = 20): Promise<TrueFalseCard[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT
         c.id, c.questionId, q.question, q.category,
         q.correctAnswer, q.explanation,
         c.easeFactor, c.interval, c.repetitions,
         c.nextReviewDate, c.lastReviewDate,
         c.totalCorrect, c.totalWrong
       FROM true_false_cards c
       INNER JOIN true_false_questions q ON q.id = c.questionId
       WHERE c.nextReviewDate <= date('now')
       ORDER BY c.nextReviewDate ASC, RANDOM()
       LIMIT ?`,
      [limit],
    );

    return this.mapCards(rows);
  }

  /**
   * Hiç çalışılmamış yeni kartlar.
   */
  async getNewCards(limit = 10): Promise<TrueFalseCard[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT
         c.id, c.questionId, q.question, q.category,
         q.correctAnswer, q.explanation,
         c.easeFactor, c.interval, c.repetitions,
         c.nextReviewDate, c.lastReviewDate,
         c.totalCorrect, c.totalWrong
       FROM true_false_cards c
       INNER JOIN true_false_questions q ON q.id = c.questionId
       WHERE c.repetitions = 0
       ORDER BY RANDOM()
       LIMIT ?`,
      [limit],
    );

    return this.mapCards(rows);
  }

  /**
   * Karma session: due kartlar + yeni kartlar birlikte.
   * @param totalLimit Toplam kart sayısı
   * @param newRatio Yeni kart oranı (0-1), örn: 0.3 → %30 yeni
   */
  async getSessionCards(
    totalLimit = 20,
    newRatio = 0.3,
  ): Promise<TrueFalseCard[]> {
    await this.ensureInitialized();

    const newLimit = Math.round(totalLimit * newRatio);
    const dueLimit = totalLimit - newLimit;

    const dueCards = await this.getDueCards(dueLimit);
    const dueIds = dueCards.map((c) => c.questionId);

    // Yeni kartlar, due listesinde olmayanlardan
    const placeholders =
      dueIds.length > 0 ? dueIds.map(() => "?").join(",") : "NULL";

    const newRows = await this.db!.getAllAsync<any>(
      `SELECT
         c.id, c.questionId, q.question, q.category,
         q.correctAnswer, q.explanation,
         c.easeFactor, c.interval, c.repetitions,
         c.nextReviewDate, c.lastReviewDate,
         c.totalCorrect, c.totalWrong
       FROM true_false_cards c
       INNER JOIN true_false_questions q ON q.id = c.questionId
       WHERE c.repetitions = 0
         AND c.questionId NOT IN (${placeholders})
       ORDER BY RANDOM()
       LIMIT ?`,
      [...dueIds, newLimit],
    );

    const newCards = this.mapCards(newRows);
    const all = [...dueCards, ...newCards];

    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }

    return all;
  }

  /**
   * Kategoriye göre session.
   */
  async getSessionByCategory(
    category: string,
    limit = 20,
  ): Promise<TrueFalseCard[]> {
    await this.ensureInitialized();

    const rows = await this.db!.getAllAsync<any>(
      `SELECT
         c.id, c.questionId, q.question, q.category,
         q.correctAnswer, q.explanation,
         c.easeFactor, c.interval, c.repetitions,
         c.nextReviewDate, c.lastReviewDate,
         c.totalCorrect, c.totalWrong
       FROM true_false_cards c
       INNER JOIN true_false_questions q ON q.id = c.questionId
       WHERE q.category = ?
       ORDER BY c.nextReviewDate ASC, RANDOM()
       LIMIT ?`,
      [category, limit],
    );

    return this.mapCards(rows);
  }

  // ─── Cevap Kaydet (SM-2 uygula) ───────────────────────────────

  /**
   * Kullanıcının cevabını işler, SM-2 ile sonraki review tarihini hesaplar.
   * @param cardId    true_false_cards.id
   * @param isCorrect kullanıcı doğru mu bildi
   * @param quality   SM-2 kalite skoru (0-3). Belirtilmezse: doğru=3, yanlış=0
   */
  async answerCard(
    cardId: number,
    isCorrect: boolean,
    quality?: 0 | 1 | 2 | 3,
  ): Promise<SM2Result> {
    await this.ensureInitialized();

    const card = await this.db!.getFirstAsync<{
      easeFactor: number;
      interval: number;
      repetitions: number;
    }>(
      "SELECT easeFactor, interval, repetitions FROM true_false_cards WHERE id = ?",
      [cardId],
    );

    if (!card) throw new Error(`Kart bulunamadı: ${cardId}`);

    const q: 0 | 1 | 2 | 3 =
      quality !== undefined ? quality : isCorrect ? 3 : 0;

    const result = sm2(q, card.easeFactor, card.interval, card.repetitions);

    await this.db!.runAsync(
      `UPDATE true_false_cards SET
         easeFactor = ?,
         interval = ?,
         repetitions = ?,
         nextReviewDate = ?,
         lastReviewDate = date('now'),
         totalCorrect = totalCorrect + ?,
         totalWrong = totalWrong + ?
       WHERE id = ?`,
      [
        result.easeFactor,
        result.interval,
        result.repetitions,
        result.nextReviewDate,
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        cardId,
      ],
    );

    return result;
  }

  // ─── Reset ────────────────────────────────────────────────────

  async resetCard(cardId: number): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE true_false_cards SET
         easeFactor = 2.5, interval = 0, repetitions = 0,
         nextReviewDate = date('now'), lastReviewDate = NULL,
         totalCorrect = 0, totalWrong = 0
       WHERE id = ?`,
      [cardId],
    );
  }

  async resetByCategory(category: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE true_false_cards SET
         easeFactor = 2.5, interval = 0, repetitions = 0,
         nextReviewDate = date('now'), lastReviewDate = NULL,
         totalCorrect = 0, totalWrong = 0
       WHERE questionId IN (
         SELECT id FROM true_false_questions WHERE category = ?
       )`,
      [category],
    );
  }

  async resetAll(): Promise<void> {
    await this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE true_false_cards SET
         easeFactor = 2.5, interval = 0, repetitions = 0,
         nextReviewDate = date('now'), lastReviewDate = NULL,
         totalCorrect = 0, totalWrong = 0`,
    );
  }

  // ─── İstatistikler ────────────────────────────────────────────

  async getStats(): Promise<TrueFalseStats> {
    await this.ensureInitialized();

    const totals = await this.db!.getFirstAsync<{
      totalCards: number;
      dueToday: number;
      mastered: number;
      learning: number;
      newCards: number;
      totalCorrect: number;
      totalWrong: number;
    }>(
      `SELECT
         COUNT(*)                                                        AS totalCards,
         SUM(CASE WHEN nextReviewDate <= date('now') THEN 1 ELSE 0 END) AS dueToday,
         SUM(CASE WHEN interval >= 21 THEN 1 ELSE 0 END)                AS mastered,
         SUM(CASE WHEN repetitions > 0 AND interval < 21 THEN 1 ELSE 0 END) AS learning,
         SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END)               AS newCards,
         SUM(totalCorrect)                                               AS totalCorrect,
         SUM(totalWrong)                                                 AS totalWrong
       FROM true_false_cards`,
    );

    const catRows = await this.db!.getAllAsync<{
      category: string;
      total: number;
      mastered: number;
      totalCorrect: number;
      totalWrong: number;
    }>(
      `SELECT
         q.category,
         COUNT(*)                                               AS total,
         SUM(CASE WHEN c.interval >= 21 THEN 1 ELSE 0 END)    AS mastered,
         SUM(c.totalCorrect)                                    AS totalCorrect,
         SUM(c.totalWrong)                                      AS totalWrong
       FROM true_false_cards c
       INNER JOIN true_false_questions q ON q.id = c.questionId
       GROUP BY q.category
       ORDER BY q.category ASC`,
    );

    const tc = totals?.totalCorrect ?? 0;
    const tw = totals?.totalWrong ?? 0;

    return {
      totalCards: totals?.totalCards ?? 0,
      dueToday: totals?.dueToday ?? 0,
      mastered: totals?.mastered ?? 0,
      learning: totals?.learning ?? 0,
      newCards: totals?.newCards ?? 0,
      totalCorrect: tc,
      totalWrong: tw,
      successRate: tc + tw > 0 ? Math.round((tc / (tc + tw)) * 100) : 0,
      categoryStats: catRows.map((r) => ({
        category: r.category,
        total: r.total,
        mastered: r.mastered,
        successRate:
          r.totalCorrect + r.totalWrong > 0
            ? Math.round(
                (r.totalCorrect / (r.totalCorrect + r.totalWrong)) * 100,
              )
            : 0,
      })),
    };
  }

  // ─── Yardımcılar ──────────────────────────────────────────────

  async getCategories(): Promise<string[]> {
    await this.ensureInitialized();
    const rows = await this.db!.getAllAsync<{ category: string }>(
      "SELECT DISTINCT category FROM true_false_questions ORDER BY category ASC",
    );
    return rows.map((r) => r.category);
  }

  async getTodayReviewCount(): Promise<number> {
    await this.ensureInitialized();
    const result = await this.db!.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM true_false_cards WHERE lastReviewDate = date('now')",
    );
    return result?.cnt ?? 0;
  }

  /** Kartın SM-2 durumunu label olarak döndür */
  getCardStatus(card: TrueFalseCard): "new" | "learning" | "mastered" {
    if (card.repetitions === 0) return "new";
    if (card.interval >= 21) return "mastered";
    return "learning";
  }

  private mapCards(rows: any[]): TrueFalseCard[] {
    return rows.map((r) => ({
      ...r,
      correctAnswer: r.correctAnswer === 1 || r.correctAnswer === true,
    }));
  }
}

// ─── Singleton Export ─────────────────────────────────────────

export const trueFalseManager = TrueFalseManager.getInstance();
