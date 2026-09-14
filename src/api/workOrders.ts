import type { WorkOrder } from '@/src/types/WorkOrder';
import { getActiveWorkOrderUuid, getToken, setActiveWorkOrderUuid } from '@/src/utils/storage';
import { File } from 'expo-file-system';
import { deleteDatabaseSync } from 'expo-sqlite';
import { sqliteDirectory, sqliteFileDirectory } from '@/src/db';
import client from "./client";

const sqliteDir = sqliteFileDirectory;

export const workOrdersApi = {
	getAll: () => client.get<WorkOrder[]>( '/work-orders' ),

	getById: ( id: string ) => client.get<ArrayBuffer>( `/work-orders/${ id }/download`, { responseType: "arraybuffer" } ),
};

function localDbFile( uuid: string ) {
	return new File( sqliteDir, `${ uuid }.sqlite` );
}

async function isValidSqliteFile( file: File ): Promise<boolean> {
	if( !file.exists || file.size < 100 ) return false;

	try {
		const bytes = new Uint8Array( await file.arrayBuffer() );
		const header = String.fromCharCode( ...bytes.slice( 0, 15 ) );
		return header === 'SQLite format 3';
	} catch {
		return false;
	}
}

export async function downloadWorkOrdersDb( uuid: string ): Promise<void> {
	if( uuid === "" ) return;

	if( !sqliteDir.exists ) {
		sqliteDir.create();
	}

	const file = localDbFile( uuid );
	if( await isValidSqliteFile( file ) ) {
		await setActiveWorkOrderUuid( uuid );
		return;
	}

	if( file.exists ) {
		try {
			deleteDatabaseSync( `${ uuid }.sqlite`, sqliteDirectory );
		} catch {
			file.delete();
		}
	}

	const token = await getToken();
	const baseUrl = process.env.EXPO_PUBLIC_API_URL;
	if( !baseUrl ) {
		throw new Error( 'EXPO_PUBLIC_API_URL is not set' );
	}

	await File.downloadFileAsync(
		`${ baseUrl }/work-orders/${ uuid }/download`,
		file,
		{
			idempotent: true,
			headers: {
				Accept: 'application/octet-stream',
				...( token ? { Authorization: `Bearer ${ token }` } : {} ),
			},
		},
	);

	if( !( await isValidSqliteFile( file ) ) ) {
		throw new Error( 'Downloaded work order database is not a valid SQLite file.' );
	}

	await setActiveWorkOrderUuid( uuid );
}

export async function getActiveWorkOrderDbName(): Promise<string | null> {
	return getActiveWorkOrderUuid();
}

export function dbExists( uuid: string ): boolean {
	if( uuid === '' ) return false;

	return localDbFile( uuid ).exists;
}

export async function deleteLocalDb( uuid: string ): Promise<void> {
	debugSqliteDir();
	if( uuid === '' ) return;

	try {
		deleteDatabaseSync( `${ uuid }.sqlite`, sqliteDirectory );
	} catch {
		for( const extension of [ 'db', 'sqlite' ] ) {
			for( const suffix of [ '', '-wal', '-shm', '-journal' ] ) {
				const file = new File( sqliteDir, `${ uuid }.${ extension }${ suffix }` );
				if( file.exists ) {
					file.delete();
				}
			}
		}
	}

	debugSqliteDir();
}

export async function deleteAllLocalDbs(): Promise<void> {
	if( !sqliteDir.exists ) return;

	for( const entry of sqliteDir.list() ) {
		if( entry instanceof File ) {
			entry.delete();
			console.log( `Deleted local file ${ entry.name }` );
		} else {
			entry.delete();
			console.log( `Deleted local directory ${ entry.name }` );
		}
	}
}

export function debugSqliteDir(): void {
	if( !sqliteDir.exists ) {
		console.log( "SQLite directory does not exist." );
		return;
	}

	const files = sqliteDir.list();

	if( files.length ) {
		for( const item of sqliteDir.list() ) {
			if( item instanceof File ) {
				console.log( `${ item.name } — ${ item.size } bytes` );
			} else {
				console.log( `${ item.name }/ (directory)` );
			}
		}
	} else {
		console.log( "Directory is empty" );
	}
}
