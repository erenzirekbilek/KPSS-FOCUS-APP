import * as SQLite from "expo-sqlite";
import questionsData from "../assets/data/questions.json";

const DATABASE_NAME = "kpss_focus_v11.db";

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

type TestKeyValue = { subjectId: number; category: string; testId: number };

const CATEGORY_MAP: Record<string, number> = {
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
  "Hukukun Temel Kavramları": 3,
  "Devlet Biçimleri ve Demokrasi": 3,
  "ANAYASA HUKUKUNA GİRİŞ": 3,
  "1982 ANAYASA GENEL ESASLARI": 3,
  "TEMEL HAK VE HÜRRİYETLER": 3,
  YASAMA: 3,
  YÜRÜTME: 3,
  YARGI: 3,
  "İNSAN HAKLARI": 3,
  "Güncel Bilgiler": 4,
  "2020 Güncel Bilgiler": 4,
  "2021 Güncel Bilgiler": 4,
  "2022 Güncel Bilgiler": 4,
  "Güncel Olaylar": 4,
  "Uluslararası Kuruluşlar": 4,
};

class Database {
  private static instance: Database | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
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
      await this.db.runAsync("PRAGMA synchronous = NORMAL");
      await this.db.runAsync("PRAGMA cache_size = 10000");
      await this.createTables();
      await this.seedData();
      console.log("SQLite: Veritabanı hazır.");
    } catch (error) {
      console.error("SQLite: Başlatma hatası:", error);
      this.initPromise = null;
      this.db = null;
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db || !this.initPromise) {
      await this.initialize();
    } else {
      await this.initPromise;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    )`);
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subjectId INTEGER NOT NULL,
      title TEXT NOT NULL,
      questionCount INTEGER DEFAULT 0,
      unique_test_key TEXT UNIQUE,
      FOREIGN KEY (subjectId) REFERENCES subjects(id)
    )`);
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      testId INTEGER NOT NULL,
      question TEXT NOT NULL,
      category TEXT NOT NULL,
      options TEXT NOT NULL,
      correctAnswer TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY (testId) REFERENCES tests(id)
    )`);
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS user_progress (
      testId INTEGER PRIMARY KEY,
      lastQuestionIndex INTEGER NOT NULL DEFAULT 0,
      isCompleted INTEGER DEFAULT 0,
      correctCount INTEGER DEFAULT 0,
      wrongCount INTEGER DEFAULT 0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (testId) REFERENCES tests(id)
    )`);
    // Seed tamamlandı mı takip etmek için
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
  }

  private async seedData(): Promise<void> {
    if (!this.db) return;

    // Seed daha önce BAŞARIYLA tamamlandıysa atla
    const seedDone = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'seed_done'",
    );
    if (seedDone?.value === "1") {
      console.log("SQLite: Seed zaten tamamlanmış, atlanıyor.");
      return;
    }

    // Yarıda kalmış olabilir — temizle
    await this.db.runAsync("DELETE FROM questions");
    await this.db.runAsync("DELETE FROM tests");
    await this.db.runAsync("DELETE FROM subjects");
    await this.db.runAsync("DELETE FROM meta");

    try {
      // 1. Subjects
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
        await this.db.runAsync(
          "INSERT INTO subjects (id, title, color, icon) VALUES (?, ?, ?, ?)",
          [s.id, s.title, s.color, s.icon],
        );
      }

      // 2. Veriyi düzleştir ve geçersiz kayıtları filtrele
      const flatData: any[] = (questionsData as any)
        .flat(Infinity)
        .filter(
          (q: any) =>
            q &&
            q.question != null &&
            q.question !== "" &&
            q.category != null &&
            q.options != null &&
            q.correctAnswer != null,
        );

      console.log(`SQLite: Toplam ${flatData.length} geçerli soru yüklenecek.`);

      // 3. Benzersiz testleri bul ve insert et
      const testKeys: Map<string, TestKeyValue> = new Map();
      for (const q of flatData) {
        const key = `${q.category}-${q.testId}`;
        if (!testKeys.has(key)) {
          testKeys.set(key, {
            subjectId: CATEGORY_MAP[q.category?.trim()] ?? 1,
            category: q.category,
            testId: q.testId,
          });
        }
      }
      for (const [key, v] of Array.from(testKeys.entries())) {
        await this.db.runAsync(
          "INSERT OR IGNORE INTO tests (subjectId, title, unique_test_key) VALUES (?, ?, ?)",
          [v.subjectId, `${v.category} - Test ${v.testId}`, key],
        );
      }

      // 4. Test id map oluştur
      const testRows = await this.db.getAllAsync<{
        id: number;
        unique_test_key: string;
      }>("SELECT id, unique_test_key FROM tests");
      const testMap: Map<string, number> = new Map();
      for (const row of testRows) testMap.set(row.unique_test_key, row.id);

      // 5. Soruları 100'lük chunk'larda insert et
      const CHUNK_SIZE = 100;
      let inserted = 0;

      for (let i = 0; i < flatData.length; i += CHUNK_SIZE) {
        const chunk = flatData.slice(i, i + CHUNK_SIZE);

        await this.db.runAsync("BEGIN");
        try {
          for (const q of chunk) {
            const dbTestId = testMap.get(`${q.category}-${q.testId}`);
            if (!dbTestId) continue;

            const question = String(q.question ?? "").trim();
            const category = String(q.category ?? "").trim();
            const options = JSON.stringify(q.options ?? {});
            const correctAnswer = String(q.correctAnswer ?? "").trim();
            const explanation = String(q.explanation ?? "").trim();

            if (!question || !category || !correctAnswer) continue;

            await this.db.runAsync(
              "INSERT INTO questions (testId, question, category, options, correctAnswer, explanation) VALUES (?, ?, ?, ?, ?, ?)",
              [
                dbTestId,
                question,
                category,
                options,
                correctAnswer,
                explanation,
              ],
            );
            inserted++;
          }
          await this.db.runAsync("COMMIT");
        } catch (err) {
          await this.db.runAsync("ROLLBACK");
          throw err;
        }

        console.log(`SQLite: ${inserted}/${flatData.length} soru eklendi.`);
      }

      // 6. questionCount güncelle
      await this.db.runAsync(`
        UPDATE tests SET questionCount = (
          SELECT COUNT(*) FROM questions WHERE questions.testId = tests.id
        )
      `);

      // 7. Seed başarıyla tamamlandı — işaretle
      await this.db.runAsync(
        "INSERT INTO meta (key, value) VALUES ('seed_done', '1')",
      );

      console.log(`SQLite: Seed tamamlandı. ${inserted} soru eklendi.`);
    } catch (error) {
      console.error("Seed işlemi başarısız:", error);
      // Yarıda kalan veriyi temizle ki bir sonraki açılışta tekrar denensin
      await this.db.runAsync("DELETE FROM questions");
      await this.db.runAsync("DELETE FROM tests");
      await this.db.runAsync("DELETE FROM subjects");
      await this.db.runAsync("DELETE FROM meta");
      throw error;
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  async saveProgress(
    testId: number,
    questionIndex: number,
    isCompleted: boolean = false,
    correctCount: number = 0,
    wrongCount: number = 0,
  ): Promise<void> {
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
    const map: Map<number, UserProgress> = new Map();
    const rows = await this.db!.getAllAsync<UserProgress>(
      `SELECT up.* FROM user_progress up
       INNER JOIN tests t ON t.id = up.testId
       WHERE t.subjectId = ?`,
      [subjectId],
    );
    for (const row of rows) map.set(row.testId, row);
    return map;
  }

  async resetProgress(testId: number): Promise<void> {
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
        `SELECT up.lastQuestionIndex, up.isCompleted, t.questionCount
         FROM user_progress up INNER JOIN tests t ON t.id = up.testId`,
      );

      const totalTests = testCount?.cnt ?? 0;
      let overallProgress = 0;
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
            `SELECT up.*, t.questionCount FROM user_progress up
             INNER JOIN tests t ON t.id = up.testId WHERE t.subjectId = ?`,
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
        `SELECT DATE(updatedAt) as date, SUM(correctCount + wrongCount) as count
         FROM user_progress
         WHERE updatedAt >= DATE('now', '-21 days')
         GROUP BY DATE(updatedAt)`,
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
