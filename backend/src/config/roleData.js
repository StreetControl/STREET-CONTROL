// Define role permissions matrix
const rolePermissions = {
  DIRECTOR: ["DIRECTOR", "ADMIN", "SUPER_ADMIN"],
  ORGANIZER: ["ORGANIZER", "ADMIN", "SUPER_ADMIN"],
  REFEREE: ["REFEREE", "ADMIN", "SUPER_ADMIN"],
  ADMIN: ["ADMIN", "SUPER_ADMIN"],
  SUPER_ADMIN: ["SUPER_ADMIN"],
};

const validRoles = ['DIRECTOR', 'ORGANIZER', 'REFEREE', 'ADMIN', 'SUPER_ADMIN'];

export { rolePermissions, validRoles };
