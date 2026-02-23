import * as SQLite from "expo-sqlite";
import questionsData from "../assets/data/questions.json";

// Sürümü v6 yaptım, böylece tablo yapısı ve yeni kategoriler sıfırdan oluşur.
const DATABASE_NAME = "kpss_focus_v6.db";

export interface Question {
  id: number;
  testId: number;
  question: string;
  category: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
}

export interface Test {
  id: number;
  subjectId: number;
  title: string;
  questionCount: number;
}

export interface Subject {
  id: number;
  title: string;
  color: string;
  icon: string;
}

export interface UserProgress {
  testId: number;
  lastQuestionIndex: number;
  isCompleted: number;
  correctCount: number;
  wrongCount: number;
  updatedAt: string;
}

export interface OverallStats {
  totalSolved: number;
  totalCorrect: number;
  totalWrong: number;
  successPercent: number;
  completedTests: number;
  totalTests: number;
  overallProgress: number;
  subjectStats: {
    subjectId: number;
    title: string;
    color: string;
    icon: string;
    progressPercent: number;
    correctCount: number;
    wrongCount: number;
  }[];
  dailyActivity: { date: string; count: number }[];
}

export class Database {
  private static instance: Database;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async initialize() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.isInitializing) return;
      this.isInitializing = true;

      try {
        this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await this.db.execAsync("PRAGMA journal_mode = WAL;");
        await this.createTables();
        await this.seedData();
        console.log("SQLite: Veritabanı hazır ve güncellendi.");
      } catch (error) {
        console.error("SQLite: Başlatma hatası:", error);
        this.initPromise = null;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized() {
    if (!this.db) await this.initialize();
    await this.initPromise;
  }

  private async createTables() {
    if (!this.db) return;
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY, 
        title TEXT NOT NULL, 
        color TEXT NOT NULL, 
        icon TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        subjectId INTEGER NOT NULL, 
        title TEXT NOT NULL, 
        questionCount INTEGER DEFAULT 0,
        unique_test_key TEXT UNIQUE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        testId INTEGER NOT NULL, 
        question TEXT NOT NULL, 
        category TEXT NOT NULL, 
        options TEXT NOT NULL, 
        correctAnswer TEXT NOT NULL, 
        explanation TEXT,
        FOREIGN KEY (testId) REFERENCES tests(id)
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        testId INTEGER PRIMARY KEY,
        lastQuestionIndex INTEGER NOT NULL DEFAULT 0,
        isCompleted INTEGER DEFAULT 0,
        correctCount INTEGER DEFAULT 0,
        wrongCount INTEGER DEFAULT 0,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (testId) REFERENCES tests(id)
      );
    `);
  }

  private async seedData() {
    if (!this.db) return;

    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync("DELETE FROM questions;");
      await this.db!.runAsync("DELETE FROM tests;");
      await this.db!.runAsync("DELETE FROM subjects;");
      await this.db!.runAsync(
        "DELETE FROM sqlite_sequence WHERE name IN ('questions', 'tests');",
      );

      const subjects = [
        { id: 1, title: "Tarih", color: "#3b82f6", icon: "book" },
        { id: 2, title: "Coğrafya", color: "#06b6d4", icon: "compass" },
        { id: 3, title: "Vatandaşlık", color: "#d946ef", icon: "shield" },
        {
          id: 4,
          title: "Güncel Bilgiler",
          color: "#f43f5e",
          icon: "newspaper",
        },
      ];

      for (const s of subjects) {
        await this.db!.runAsync(
          "INSERT INTO subjects (id, title, color, icon) VALUES (?, ?, ?, ?)",
          [s.id, s.title, s.color, s.icon],
        );
      }

      // --- MASTER KATEGORİ EŞLEŞTİRME SÖZLÜĞÜ ---
      const CATEGORY_MAP: Record<string, number> = {
        // TARİH (ID: 1)
        "İslamiyet Öncesi Türk Tarihi": 1,
        "İlk Türk İslam Devletleri": 1,
        "Anadolu (Türkiye) Selçuklu Devleti ve I. ve II. Beylikler Dönemi": 1,
        "Osmanlı Devleti Kültür ve Medeniyeti": 1,
        "Osmanlı Devleti Kuruluş Dönemi": 1,
        "Osmanlı Devleti Yükselme Dönemi": 1,
        "XVII. Yüzyılda Osmanlı Devleti (Duraklama Dönemi)": 1,
        "XVIII. Yüzyılda Osmanlı Devleti (Gerileme Dönemi)": 1,
        "XIX. Yüzyılda Osmanlı Devleti (Dağılma Dönemi)": 1,
        "XX. Yüzyılda Osmanlı Devleti": 1,
        "Mondros Ateşkes Antlaşması": 1,
        "İlk İşgaller ve Cemiyetler": 1,
        "Kurtuluş Savaşı Hazırlık Dönemi": 1,
        "I. TBMM Dönemi ve Ayaklanmalar": 1,
        "Kurtuluş Savaşı Muharebeler Dönemi ve Sonrası": 1,
        "Atatürk'ün Hayatı": 1,
        "Atatürk Dönemi İç Politika": 1,
        "Atatürk İlkeleri": 1,
        "Atatürk İnkılapları": 1,
        "Atatürk Dönemi Dış Politika": 1,
        "XX. Yüzyıl Başlarında Dünya": 1,
        "II. Dünya Savaşı": 1,
        "Soğuk Savaş Dönemi": 1,
        "Yumuşama Dönemi": 1,
        "Küreselleşen Dünya": 1,

        // COĞRAFYA (ID: 2)
        "Türkiye'nin Coğrafi Konumu": 2,
        "Türkiye'nin Yer Şekilleri": 2,
        "Yer Şekilleri": 2,
        "Türkiye'nin İklimi ve Bitki Örtüsü": 2,
        "Türkiye'de Nüfus ve Yerleşme": 2,
        "Türkiye'de Tarım": 2,
        "Türkiye'de Hayvancılık": 2,
        "Türkiye'de Madenler ve Enerji Kaynakları": 2,
        "Türkiye'de Sanayi": 2,
        "Türkiye'de Ulaşım": 2,
        "Türkiye'de Ticaret": 2,
        "Türkiye'de Turizm": 2,
        "Türkiye'nin Bölgesel Coğrafyası": 2,

        // VATANDAŞLIK (ID: 3)
        "Hukukun Temel Kavramları": 3,
        "Devlet Biçimleri ve Demokrasi": 3,
        "Anayasa Hukukuna Giriş": 3,
        "1982 Anayasası": 3,
        Yasama: 3,
        Yürütme: 3,
        Yargı: 3,
        "İdare Hukuku": 3,

        // GÜNCEL BİLGİLER (ID: 4)
        "Güncel Bilgiler": 4,
        "Güncel Olaylar": 4,
        "Uluslararası Kuruluşlar": 4,
      };

      const flatData = (questionsData as any).flat(Infinity);
      const testMap = new Map<string, number>();

      for (const q of flatData) {
        // Kategori ismi tam eşleşmeli, yoksa Tarih (1) varsayılan olur.
        const targetSubjectId = CATEGORY_MAP[q.category.trim()] || 1;
        const key = `${q.category}-${q.testId}`;

        if (!testMap.has(key)) {
          const result = await this.db!.runAsync(
            "INSERT OR IGNORE INTO tests (subjectId, title, unique_test_key) VALUES (?, ?, ?)",
            [targetSubjectId, `${q.category} - Test ${q.testId}`, key],
          );

          if (result.lastInsertRowId) {
            testMap.set(key, result.lastInsertRowId);
          } else {
            const row = await this.db!.getFirstAsync<{ id: number }>(
              "SELECT id FROM tests WHERE unique_test_key = ?",
              [key],
            );
            if (row) testMap.set(key, row.id);
          }
        }
      }

      const qStmt = await this.db!.prepareAsync(
        "INSERT INTO questions (testId, question, category, options, correctAnswer, explanation) VALUES (?, ?, ?, ?, ?, ?)",
      );

      try {
        for (const q of flatData) {
          const dbTestId = testMap.get(`${q.category}-${q.testId}`);
          if (dbTestId) {
            await qStmt.executeAsync([
              dbTestId,
              q.question,
              q.category,
              JSON.stringify(q.options),
              q.correctAnswer,
              q.explanation || "",
            ]);
          }
        }
      } finally {
        await qStmt.finalizeAsync();
      }

      await this.db!.execAsync(`
        UPDATE tests SET questionCount = (
          SELECT COUNT(*) FROM questions WHERE questions.testId = tests.id
        );
      `);
    });
  }

  // --- Diğer yardımcı metodlar ---
  async saveProgress(
    testId: number,
    questionIndex: number,
    isCompleted: boolean = false,
    correctCount: number = 0,
    wrongCount: number = 0,
  ) {
    await this.ensureInitialized();
    try {
      await this.db!.runAsync(
        `INSERT INTO user_progress (testId, lastQuestionIndex, isCompleted, correctCount, wrongCount, updatedAt) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(testId) DO UPDATE SET 
           lastQuestionIndex = excluded.lastQuestionIndex,
           isCompleted = excluded.isCompleted,
           correctCount = excluded.correctCount,
           wrongCount = excluded.wrongCount,
           updatedAt = CURRENT_TIMESTAMP`,
        [testId, questionIndex, isCompleted ? 1 : 0, correctCount, wrongCount],
      );
    } catch (error) {
      console.error("İlerleme kaydedilemedi:", error);
    }
  }

  async getProgress(testId: number): Promise<UserProgress | null> {
    await this.ensureInitialized();
    return await this.db!.getFirstAsync<UserProgress>(
      "SELECT * FROM user_progress WHERE testId = ?",
      [testId],
    );
  }

  async getProgressBySubject(
    subjectId: number,
  ): Promise<Map<number, UserProgress>> {
    await this.ensureInitialized();
    const map = new Map<number, UserProgress>();
    const rows = await this.db!.getAllAsync<UserProgress>(
      `SELECT up.* FROM user_progress up INNER JOIN tests t ON t.id = up.testId WHERE t.subjectId = ?`,
      [subjectId],
    );
    for (const row of rows) map.set(row.testId, row);
    return map;
  }

  async resetProgress(testId: number) {
    await this.ensureInitialized();
    await this.db!.runAsync("DELETE FROM user_progress WHERE testId = ?", [
      testId,
    ]);
  }

  async getOverallStats(): Promise<OverallStats> {
    await this.ensureInitialized();
    try {
      const totals = await this.db!.getFirstAsync<{
        totalCorrect: number;
        totalWrong: number;
        completedTests: number;
      }>(
        `SELECT SUM(correctCount) as totalCorrect, SUM(wrongCount) as totalWrong, SUM(isCompleted) as completedTests FROM user_progress`,
      );
      const testCount = await this.db!.getFirstAsync<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM tests",
      );
      const progressRows = await this.db!.getAllAsync<{
        lastQuestionIndex: number;
        isCompleted: number;
        questionCount: number;
      }>(
        `SELECT up.lastQuestionIndex, up.isCompleted, t.questionCount FROM user_progress up INNER JOIN tests t ON t.id = up.testId`,
      );

      let overallProgress = 0;
      const totalTests = testCount?.cnt ?? 0;
      if (progressRows.length > 0) {
        let sum = 0;
        for (const r of progressRows) {
          if (r.isCompleted) sum += 100;
          else if (r.questionCount > 0)
            sum += (r.lastQuestionIndex / r.questionCount) * 100;
        }
        overallProgress = totalTests > 0 ? Math.round(sum / totalTests) : 0;
      }

      const subjects = await this.db!.getAllAsync<Subject>(
        "SELECT * FROM subjects ORDER BY id ASC",
      );
      const subjectStats = await Promise.all(
        subjects.map(async (s) => {
          const rows = await this.db!.getAllAsync<any>(
            `SELECT up.*, t.questionCount FROM user_progress up INNER JOIN tests t ON t.id = up.testId WHERE t.subjectId = ?`,
            [s.id],
          );
          const subT = await this.db!.getFirstAsync<{ cnt: number }>(
            "SELECT COUNT(*) as cnt FROM tests WHERE subjectId = ?",
            [s.id],
          );
          let pSum = 0,
            c = 0,
            w = 0;
          for (const r of rows) {
            if (r.isCompleted) pSum += 100;
            else pSum += (r.lastQuestionIndex / r.questionCount) * 100;
            c += r.correctCount;
            w += r.wrongCount;
          }
          return {
            subjectId: s.id,
            title: s.title,
            color: s.color,
            icon: s.icon,
            progressPercent: subT?.cnt ? Math.round(pSum / subT.cnt) : 0,
            correctCount: c,
            wrongCount: w,
          };
        }),
      );

      const activityRows = await this.db!.getAllAsync<{
        date: string;
        count: number;
      }>(
        `SELECT DATE(updatedAt) as date, SUM(correctCount + wrongCount) as count FROM user_progress WHERE updatedAt >= DATE('now', '-21 days') GROUP BY DATE(updatedAt)`,
      );

      return {
        totalSolved: (totals?.totalCorrect || 0) + (totals?.totalWrong || 0),
        totalCorrect: totals?.totalCorrect || 0,
        totalWrong: totals?.totalWrong || 0,
        successPercent:
          (totals?.totalCorrect || 0) > 0
            ? Math.round(
                (totals!.totalCorrect /
                  (totals!.totalCorrect + totals!.totalWrong)) *
                  100,
              )
            : 0,
        completedTests: totals?.completedTests || 0,
        totalTests,
        overallProgress,
        subjectStats,
        dailyActivity: activityRows,
      };
    } catch {
      return {} as OverallStats;
    }
  }

  async getAllSubjects(): Promise<Subject[]> {
    await this.ensureInitialized();
    return await this.db!.getAllAsync<Subject>(
      "SELECT * FROM subjects ORDER BY id ASC",
    );
  }

  async getTestsBySubject(subjectId: number): Promise<Test[]> {
    await this.ensureInitialized();
    return await this.db!.getAllAsync<Test>(
      "SELECT * FROM tests WHERE subjectId = ? ORDER BY id ASC",
      [subjectId],
    );
  }

  async getQuestionsByTest(testId: number): Promise<Question[]> {
    await this.ensureInitialized();
    const results = await this.db!.getAllAsync<any>(
      "SELECT * FROM questions WHERE testId = ?",
      [testId],
    );
    return results.map((q) => ({ ...q, options: JSON.parse(q.options) }));
  }
}

export const db = Database.getInstance();
