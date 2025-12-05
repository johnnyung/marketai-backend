export interface IngestionResult {
    success: boolean;
    source: string;
    recordsProcessed: number;
    timestamp: string;
    dataSample?: any;
    error?: string;
}
