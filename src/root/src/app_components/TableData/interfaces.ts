export type TableData<T> = T[];

export type TableMeta = {
    page: number;       // Pagina attuale (da 1 in poi)
    per_page: number;   // Numero di elementi visualizzati in pagina
    pages_num: number; // Numero pagine totali (lo ritorna il backend)
    items_num: number; // Numero items totali (lo ritorna il backend)
}

export type TableInterface<T> = {
    data: TableData<T>;     // Dati
    meta: TableMeta;        // Mertadati per tabella
}
    
export type TableFilters<T> = {
    search?: string;         // Stringa di ricerca generica
} & Omit<TableMeta, 'pages_num'|'items_num'> & Partial<Record<keyof T, string | number>>;

export const DEFtableMeta = {
    page: 1,
    per_page: 25,
    pages_num: 1
}