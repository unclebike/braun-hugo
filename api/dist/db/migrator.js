const splitStatements = (sql) => {
    return sql
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
};
export async function runMigrations(db, migrations) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`).run();
    const ordered = [...migrations].sort((a, b) => a.name.localeCompare(b.name));
    for (const migration of ordered) {
        const alreadyApplied = await db.prepare('SELECT name FROM _migrations WHERE name = ?').bind(migration.name).first();
        if (alreadyApplied)
            continue;
        const statements = splitStatements(migration.sql);
        for (const statement of statements) {
            await db.prepare(statement).run();
        }
        await db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, datetime(\'now\'))').bind(migration.name).run();
    }
}
//# sourceMappingURL=migrator.js.map