/**
 * ROLE DATA - Role permissions and configuration
 */

import { UserRole } from '../types';

// Define role permissions matrix
const rolePermissions: Record<UserRole, UserRole[]> = {
  DIRECTOR: ["DIRECTOR", "ADMIN", "SUPER_ADMIN"],
  ORGANIZER: ["ORGANIZER", "ADMIN", "SUPER_ADMIN"],
  REFEREE: ["REFEREE", "ADMIN", "SUPER_ADMIN"],
  ADMIN: ["ADMIN", "SUPER_ADMIN"],
  SUPER_ADMIN: ["SUPER_ADMIN"],
};

const validRoles: UserRole[] = ['DIRECTOR', 'ORGANIZER', 'REFEREE', 'ADMIN', 'SUPER_ADMIN'];

export { rolePermissions, validRoles };
