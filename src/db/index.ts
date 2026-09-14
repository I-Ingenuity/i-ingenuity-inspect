import * as schema from "@/src/db/schema/";
import { Directory } from "expo-file-system";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { defaultDatabaseDirectory, openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

export type OpenedDatabase = {
	db: AppDatabase;
	sqlite: SQLiteDatabase;
};

/** Bare path for expo-sqlite open/delete. */
export const sqliteDirectory = defaultDatabaseDirectory;

function asFileUri( path: string ): string {
	if( path.startsWith( "file://" ) ) return path;
	if( path.startsWith( "/" ) ) return `file://${ path }`;
	return path;
}

/** Same folder as sqliteDirectory, as a file:// URI for expo-file-system. */
export const sqliteFileDirectory = new Directory( asFileUri( sqliteDirectory ) );

export function openDb( dbName: string ): OpenedDatabase {
	const sqlite = openDatabaseSync( dbName, undefined, sqliteDirectory );
	return {
		sqlite,
		db: drizzle( sqlite, { schema } ),
	};
}
