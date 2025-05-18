/* eslint-disable prettier/prettier */
const activityLogsActions = {
  farmCreated: 'Farm Created',
  trainingCreated: 'Training Created',
  userCreated: 'User Created',
  beehiveCreated: 'Beehive Created',
  farm_manager_assigned_to_farm: 'Farm Manager Assigned',
  user_added_to_farm: 'User Added to Farm',
  contractor_assigned_to_farm: 'Contractor Assigned',
  farmUpdated: 'Farm Updated',
  beeHiveUpdate: 'Beehive Updated',
  userActivated: 'User Activated',
  userDeactivated: 'User Deactivated',
  userApproval: 'User Approval',
  userUpdated: 'User Updated',
  cameraAdded: 'Camera Added',
};

const allRoles = {
  superAdmin: 'Super Admin',
  businessAccount: 'Business Account',
  farmManager: 'Farm Manager',
  user: 'User',
  contractor: 'contractor'
};

const accountStatusTypes = {
  all: 'all',
  active: 'active',
  deactive: 'deactive',
  archived: 'archived'
}

module.exports = { activityLogsActions, allRoles, accountStatusTypes };
