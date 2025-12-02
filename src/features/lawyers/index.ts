/**
 * Barrel export para el feature lawyers
 */

export { useLawyersStore, initializeLawyers } from './store/lawyersStore';
export type { Lawyer, LawyersState, LawyersFilters, CreateLawyerRequest, UpdateLawyerRequest } from './types/lawyers.types';
export { LawyerStatus, LawyerSpecialty } from './types/lawyers.types';
