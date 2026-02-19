export type MigrationFile = {
    name: string;
    sql: string;
};
export declare function runMigrations(db: D1Database, migrations: MigrationFile[]): Promise<void>;
//# sourceMappingURL=migrator.d.ts.map