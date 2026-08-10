import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.sqlite');
let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load database.sqlite, creating new instance:', err);
      dbInstance = new SQL.Database();
      initTables(dbInstance);
      seedInitialData(dbInstance);
      saveDb(dbInstance);
    }
  } else {
    dbInstance = new SQL.Database();
    initTables(dbInstance);
    seedInitialData(dbInstance);
    saveDb(dbInstance);
  }

  return dbInstance;
}

export function saveDb(dbParam?: Database): void {
  const dbToSave = dbParam || dbInstance;
  if (dbToSave) {
    try {
      const data = dbToSave.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }
}

function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      source_url TEXT,
      source_title TEXT,
      content TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      entity_name TEXT,
      entity_type TEXT,
      user_id TEXT,
      context TEXT,
      importance_score REAL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      entity1_id TEXT,
      relationship_type TEXT,
      entity2_id TEXT,
      confidence_score REAL,
      user_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      fact_text TEXT,
      source_id TEXT,
      entity_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      fact_id TEXT,
      question_text TEXT,
      question_type TEXT,
      answer TEXT,
      options_json TEXT,
      difficulty_score REAL,
      entity_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      question_id TEXT,
      user_answer TEXT,
      performance_grade REAL,
      review_interval REAL,
      easiness_factor REAL,
      next_review_date TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ml_models (
      model_name TEXT PRIMARY KEY,
      weights_json TEXT,
      updated_at TEXT
    );
  `);
}

function seedInitialData(db: Database): void {
  const now = new Date().toISOString();
  
  // Seed initial user
  db.run(`INSERT OR IGNORE INTO users (id, email, password_hash, created_at) VALUES ('user_default', 'learner@gemma.ai', 'hash_demo', ?)`, [now]);

  // Seed sample source
  const sourceId = 'src_neuroscience_1';
  db.run(`
    INSERT OR IGNORE INTO sources (id, user_id, source_url, source_title, content, created_at)
    VALUES (?, 'user_default', 'https://en.wikipedia.org/wiki/Synaptic_plasticity', 'Neuroscience of Synaptic Plasticity', 'Synaptic plasticity is the ability of synapses to strengthen or weaken over time, in response to increases or decreases in their activity. Long-term potentiation (LTP) is a persistent strengthening of synapses based on recent patterns of activity. LTP was discovered by Terje Lømo in the rabbit hippocampus. NMDA receptors play a crucial role in signal transmission and cognitive learning processes.', ?)
  `, [sourceId, now]);

  // Seed initial entities
  const initialEntities = [
    { id: 'ent_synaptic_plasticity', name: 'Synaptic Plasticity', type: 'CONCEPT', importance: 5.8, ctx: 'Synaptic plasticity is the ability of synapses to strengthen or weaken over time.' },
    { id: 'ent_ltp', name: 'Long-term Potentiation', type: 'METHOD', importance: 4.9, ctx: 'Long-term potentiation (LTP) is a persistent strengthening of synapses.' },
    { id: 'ent_hippocampus', name: 'Hippocampus', type: 'LOCATION', importance: 3.8, ctx: 'LTP was discovered by Terje Lømo in the rabbit hippocampus.' },
    { id: 'ent_terje_lomo', name: 'Terje Lømo', type: 'PERSON', importance: 3.5, ctx: 'LTP was discovered by Terje Lømo in the rabbit hippocampus.' },
    { id: 'ent_nmda', name: 'NMDA Receptor', type: 'PRODUCT', importance: 4.2, ctx: 'NMDA receptors play a crucial role in signal transmission.' },
    { id: 'ent_transformer', name: 'Transformer Architecture', type: 'CONCEPT', importance: 5.2, ctx: 'The Transformer architecture relies on self-attention mechanisms.' },
    { id: 'ent_self_attention', name: 'Self-Attention', type: 'PRINCIPLE', importance: 4.7, ctx: 'Self-attention mechanisms compute representations of inputs.' }
  ];

  for (const ent of initialEntities) {
    db.run(`
      INSERT OR IGNORE INTO entities (id, entity_name, entity_type, user_id, context, importance_score, created_at)
      VALUES (?, ?, ?, 'user_default', ?, ?, ?)
    `, [ent.id, ent.name, ent.type, ent.ctx, ent.importance, now]);
  }

  // Seed initial relationships
  const initialRels = [
    { id: 'rel_1', e1: 'ent_ltp', rel: 'is_a', e2: 'ent_synaptic_plasticity', score: 0.95 },
    { id: 'rel_2', e1: 'ent_nmda', rel: 'causes', e2: 'ent_ltp', score: 0.90 },
    { id: 'rel_3', e1: 'ent_ltp', rel: 'part_of', e2: 'ent_hippocampus', score: 0.88 },
    { id: 'rel_4', e1: 'ent_terje_lomo', rel: 'relates_to', e2: 'ent_ltp', score: 0.92 },
    { id: 'rel_5', e1: 'ent_self_attention', rel: 'part_of', e2: 'ent_transformer', score: 0.96 }
  ];

  for (const r of initialRels) {
    db.run(`
      INSERT OR IGNORE INTO relationships (id, entity1_id, relationship_type, entity2_id, confidence_score, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'user_default', ?)
    `, [r.id, r.e1, r.rel, r.e2, r.score, now]);
  }

  // Seed initial questions
  const questions = [
    {
      id: 'q_1',
      fact_id: 'fact_1',
      entity_id: 'ent_synaptic_plasticity',
      q_text: 'What is the primary definition of Synaptic Plasticity in memory formation?',
      q_type: 'multiple_choice',
      answer: 'The ability of synapses to strengthen or weaken over time',
      options: JSON.stringify([
        'The ability of synapses to strengthen or weaken over time',
        'The permanent death of neurons during sleep',
        'The constant speed of electrical impulses in axons',
        'The absorption of glucose by red blood cells'
      ]),
      diff: 0.25
    },
    {
      id: 'q_2',
      fact_id: 'fact_2',
      entity_id: 'ent_ltp',
      q_text: 'Who discovered Long-term Potentiation (LTP) in the rabbit hippocampus?',
      q_type: 'multiple_choice',
      answer: 'Terje Lømo',
      options: JSON.stringify([
        'Terje Lømo',
        'Ashish Vaswani',
        'Erwin Schrödinger',
        'Santiago Ramón y Cajal'
      ]),
      diff: 0.45
    },
    {
      id: 'q_3',
      fact_id: 'fact_3',
      entity_id: 'ent_nmda',
      q_text: 'NMDA receptors play a crucial role in signal transmission and cognitive learning.',
      q_type: 'true_false',
      answer: 'True',
      options: JSON.stringify(['True', 'False']),
      diff: 0.15
    },
    {
      id: 'q_4',
      fact_id: 'fact_4',
      entity_id: 'ent_transformer',
      q_text: 'Explain how the Transformer architecture computes input representations without RNNs.',
      q_type: 'short_answer',
      answer: 'Self-attention mechanisms',
      options: JSON.stringify([]),
      diff: 0.70
    }
  ];

  for (const q of questions) {
    db.run(`
      INSERT OR IGNORE INTO questions (id, fact_id, question_text, question_type, answer, options_json, difficulty_score, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [q.id, q.fact_id, q.q_text, q.q_type, q.answer, q.options, q.diff, q.entity_id, now]);
  }

  // Seed sample history entries for training initial SGD weights
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
  db.run(`
    INSERT OR IGNORE INTO quiz_history (id, user_id, question_id, user_answer, performance_grade, review_interval, easiness_factor, next_review_date, created_at)
    VALUES ('hist_1', 'user_default', 'q_1', 'The ability of synapses to strengthen or weaken over time', 1.0, 1.0, 2.5, ?, ?)
  `, [pastDate, pastDate]);
}
