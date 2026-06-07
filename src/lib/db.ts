import fs from "node:fs";
import path from "node:path";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { articles } from "@/data/articles";
import { builtinTemplates, plazaTemplates } from "@/data/templates";
import type { Article, TemplateConfig } from "@/lib/types";

let database: DatabaseSync | null = null;

function getDatabasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "subboost.db");
}

export function db() {
  if (database) return database;

  const file = getDatabasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  database = new DatabaseSync(file);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);
  migrate(database);
  seed(database);
  return database;
}

function migrate(conn: DatabaseSync) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      author_username TEXT NOT NULL DEFAULT 'subboost',
      proxy_group_count INTEGER NOT NULL DEFAULT 0,
      rule_count INTEGER NOT NULL DEFAULT 0,
      downloads INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      is_official INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      article_order INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      cached_yaml TEXT,
      cached_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensureColumn(conn, "subscriptions", "user_id", "TEXT");
  ensureColumn(conn, "subscriptions", "cached_yaml", "TEXT");
  ensureColumn(conn, "subscriptions", "cached_at", "TEXT");
}

function seed(conn: DatabaseSync) {
  const templateCount = conn.prepare("SELECT COUNT(*) AS count FROM templates").get() as { count: number };
  if (templateCount.count === 0) {
    const insert = conn.prepare(`
      INSERT INTO templates (
        id, name, description, author_username, proxy_group_count, rule_count,
        downloads, likes, created_at, is_official, is_public, config_json
      )
      VALUES (@id, @name, @description, @author, @proxyGroupCount, @ruleCount,
        @downloads, @likes, @createdAt, @isOfficial, 1, @configJson)
    `);
    const allTemplates = [...builtinTemplates, ...plazaTemplates];
    withTransaction(conn, () => {
      for (const template of allTemplates) {
        insert.run({
          id: template.id,
          name: template.name,
          description: template.description,
          proxyGroupCount: template.proxyGroupCount,
          ruleCount: template.ruleCount,
          downloads: template.downloads,
          likes: template.likes,
          createdAt: template.createdAt,
          author: template.isOfficial ? "subboost" : "local-user",
          isOfficial: template.isOfficial ? 1 : 0,
          configJson: JSON.stringify(template)
        });
      }
    });
  }

  const insertArticle = conn.prepare(`
    INSERT INTO articles (id, title, category, article_order, content)
    VALUES (@id, @title, @category, @order, @content)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      article_order = excluded.article_order,
      content = excluded.content,
      updated_at = CURRENT_TIMESTAMP
  `);
  withTransaction(conn, () => {
    for (const article of articles) insertArticle.run(article);
  });

  const userCount = conn.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    conn.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
      .run(randomUUID(), "local", hashPassword(process.env.LOCAL_USER_PASSWORD || "local"));
  }
  const adminCount = conn.prepare("SELECT COUNT(*) AS count FROM admin_users").get() as { count: number };
  if (adminCount.count === 0) {
    conn.prepare("INSERT INTO admin_users (id, username, password_hash) VALUES (?, ?, ?)")
      .run(randomUUID(), process.env.ADMIN_USERNAME || "admin", hashPassword(process.env.ADMIN_PASSWORD || "change-me"));
  }
  const localUser = conn.prepare("SELECT id FROM users WHERE username = ?").get("local") as { id: string } | undefined;
  if (localUser) {
    conn.prepare("UPDATE subscriptions SET user_id = ? WHERE user_id IS NULL OR user_id = ''").run(localUser.id);
  }
}

export type UserRecord = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

export function listUsers() {
  const rows = db().prepare("SELECT id, username, created_at, updated_at FROM users ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
  return rows.map(userRowToDto);
}

export function listAdminUsers() {
  const rows = db().prepare("SELECT id, username, created_at, updated_at FROM admin_users ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
  return rows.map(userRowToDto);
}

export function getUserById(id: string) {
  const row = db().prepare("SELECT id, username, created_at, updated_at FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? userRowToDto(row) : null;
}

export function getAdminUserById(id: string) {
  const row = db().prepare("SELECT id, username, created_at, updated_at FROM admin_users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? userRowToDto(row) : null;
}

export function getUserByUsername(username: string) {
  const row = db().prepare("SELECT id, username, created_at, updated_at FROM users WHERE username = ?").get(username.trim()) as Record<string, unknown> | undefined;
  return row ? userRowToDto(row) : null;
}

export function createUser(input: { username: string; password: string }) {
  const username = input.username.trim();
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) throw new Error("用户名需为 3-32 位字母、数字、下划线或短横线");
  if (input.password.length < 4) throw new Error("密码至少 4 位");
  db().prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
    .run(randomUUID(), username, hashPassword(input.password));
  return getUserByUsername(username)!;
}

export function deleteUser(id: string) {
  const user = getUserById(id);
  if (!user) return;
  db().prepare("DELETE FROM subscriptions WHERE user_id = ?").run(id);
  db().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function updateUserPassword(id: string, password: string) {
  if (password.length < 4) throw new Error("密码至少 4 位");
  db().prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashPassword(password), id);
  return getUserById(id);
}

export function updateAdminPassword(id: string, password: string) {
  if (password.length < 4) throw new Error("密码至少 4 位");
  db().prepare("UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hashPassword(password), id);
  return getAdminUserById(id);
}

export function verifyUserPassword(username: string, password: string) {
  const row = db().prepare("SELECT * FROM users WHERE username = ?").get(username.trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  const passwordHash = String(row.password_hash);
  if (!verifyPassword(password, passwordHash)) return null;
  return userRowToDto(row);
}

export function verifyAdminPassword(username: string, password: string) {
  const row = db().prepare("SELECT * FROM admin_users WHERE username = ?").get(username.trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  const passwordHash = String(row.password_hash);
  if (!verifyPassword(password, passwordHash)) return null;
  return userRowToDto(row);
}

export function listTemplates(type: "default" | "plaza" | "all", query = "") {
  const where: string[] = ["is_public = 1"];
  const params: Record<string, string> = {};
  if (type === "default") where.push("is_official = 1");
  if (type === "plaza") where.push("is_official = 0");
  if (query.trim()) {
    where.push("(name LIKE @query OR description LIKE @query)");
    params.query = `%${query.trim()}%`;
  }

  const rows = db()
    .prepare(
      `SELECT * FROM templates WHERE ${where.join(" AND ")}
       ORDER BY is_official DESC, created_at DESC, downloads DESC`
    )
    .all(params) as Array<Record<string, unknown>>;

  return rows.map(templateRowToDto);
}

export function getTemplateFromDb(id: string) {
  const row = db().prepare("SELECT * FROM templates WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? templateRowToDto(row) : null;
}

export function listArticles(category = "all") {
  const rows = category === "all"
    ? (db().prepare("SELECT * FROM articles ORDER BY category ASC, article_order ASC").all() as Array<Record<string, unknown>>)
    : (db()
        .prepare("SELECT * FROM articles WHERE category = ? ORDER BY article_order ASC")
        .all(category) as Array<Record<string, unknown>>);
  return rows.map((row): Article => ({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category) as Article["category"],
    order: Number(row.article_order),
    content: String(row.content)
  }));
}

export type SubscriptionRecord = {
  id: string;
  userId: string | null;
  name: string;
  configJson: string;
  token: string;
  cachedYaml: string | null;
  cachedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createSubscription(input: { id: string; userId: string; name: string; configJson: string; token: string }) {
  db().prepare(
    `INSERT INTO subscriptions (id, user_id, name, config_json, token)
     VALUES (@id, @userId, @name, @configJson, @token)`
  ).run(input);
  return getSubscriptionById(input.id)!;
}

export function listSubscriptions(userId?: string) {
  const rows = userId
    ? db().prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC").all(userId) as Array<Record<string, unknown>>
    : db().prepare("SELECT * FROM subscriptions ORDER BY updated_at DESC").all() as Array<Record<string, unknown>>;
  return rows.map(subscriptionRowToDto);
}

export function getSubscriptionById(id: string, userId?: string) {
  const row = userId
    ? db().prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?").get(id, userId) as Record<string, unknown> | undefined
    : db().prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? subscriptionRowToDto(row) : null;
}

export function getSubscriptionByToken(token: string) {
  const row = db().prepare("SELECT * FROM subscriptions WHERE token = ?").get(token) as Record<string, unknown> | undefined;
  return row ? subscriptionRowToDto(row) : null;
}

export function deleteSubscription(id: string, userId?: string) {
  if (userId) db().prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?").run(id, userId);
  else db().prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
}

export function updateSubscriptionCache(id: string, yaml: string) {
  db().prepare("UPDATE subscriptions SET cached_yaml = ?, cached_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(yaml, id);
  return getSubscriptionById(id);
}

export function updateSubscriptionSettings(id: string, input: { name: string; configJson: string }) {
  db()
    .prepare("UPDATE subscriptions SET name = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(input.name, input.configJson, id);
  return getSubscriptionById(id);
}

function templateRowToDto(row: Record<string, unknown>) {
  const config = JSON.parse(String(row.config_json)) as TemplateConfig;
  return {
    ...config,
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    author: {
      username: String(row.author_username),
      avatarUrl: null
    },
    proxyGroupCount: Number(row.proxy_group_count),
    ruleCount: Number(row.rule_count),
    downloads: Number(row.downloads),
    likes: Number(row.likes),
    createdAt: String(row.created_at),
    isOfficial: Number(row.is_official) === 1,
    isPublic: Number(row.is_public) === 1,
    isOwner: false,
    isLiked: false
  };
}

function subscriptionRowToDto(row: Record<string, unknown>): SubscriptionRecord {
  return {
    id: String(row.id),
    userId: row.user_id == null ? null : String(row.user_id),
    name: String(row.name),
    configJson: String(row.config_json),
    token: String(row.token),
    cachedYaml: row.cached_yaml == null ? null : String(row.cached_yaml),
    cachedAt: row.cached_at == null ? null : String(row.cached_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function userRowToDto(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const inputHash = pbkdf2Sync(password, salt, 120000, 32, "sha256");
  const storedHash = Buffer.from(hash, "hex");
  return storedHash.length === inputHash.length && timingSafeEqual(storedHash, inputHash);
}

function ensureColumn(conn: DatabaseSync, table: string, column: string, definition: string) {
  const columns = conn.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function withTransaction(conn: DatabaseSync, fn: () => void) {
  conn.exec("BEGIN");
  try {
    fn();
    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
