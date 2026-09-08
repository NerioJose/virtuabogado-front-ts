export const EVENT_LEASE_MS = 5 * 60_000

export function nextBackoffMs(retries: number): number {
  return Math.min(30_000 * Math.pow(2, retries), 3_600_000)
}

let processingInWorker = false

export function isProcessingInWorker(): boolean {
  return processingInWorker
}

export function setProcessingInWorker(value: boolean): void {
  processingInWorker = value
}