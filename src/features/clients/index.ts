/**
 * Barrel export para el feature clients
 */

export { useClientsStore, initializeClients } from './store/clientsStore';
export type { Client, ClientsState, ClientsFilters, CreateClientRequest, UpdateClientRequest } from './types/clients.types';
export { ClientStatus } from './types/clients.types';
