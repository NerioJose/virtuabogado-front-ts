export function formatOrderId(numericId?: number | null, createdAt?: string | Date | null): string {
    if (numericId) return `ORD-${numericId.toString().padStart(5, '0')}`;
    if (createdAt) {
        const date = new Date(createdAt);
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    }
    return 'N/A';
}
