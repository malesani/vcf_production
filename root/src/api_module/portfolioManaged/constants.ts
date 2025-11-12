

export interface PortManagedAsset {
    symbol: string;                 // Symbolo asset
    percentage: number;             // Nuova percentuale di composizione portafoglio

}

export type PortManagedInfo = {
    managed_uid: string;   // UID

    title: string;                  // titolo
    description: string;             // descrizione
    tags?: string[];                // lista di tags

    // Sarà per utenti non amministratore SEMPRE active
    status: 'active' | 'draft' | 'deleted';  // Stati del portGestito: draft=Bozza | active=Valido | deleted=Eliminato

    adv_growthPercentFrom: number;  // Percentuale di crescita Da
    adv_growthPercentTo?: number;    // Percentuale di crescita A
    adv_timeRangeFrom: number;      // Range Temporale proposto Da
    adv_timeRangeTo?: number;        // Range Temporale proposto A

    assets: PortManagedAsset[];

    updated_at?: Date;            // Data di schedulazione
    created_at?: Date;            // Data di schedulazione
}