const allRoles = {
  superAdmin: ['getUsers', 'manageUsers'],
  businessAccount: [],
  farmManager: [],
  user: [],
  contractor: [],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));
const roleKeyValue = {
  superAdmin: 'superAdmin',
  businessAccount: 'businessAccount',
  farmManager: 'farmManager',
  user: 'user',
  contractor: 'contractor',
};

module.exports = {
  roles,
  roleRights,
  roleKeyValue,
};
