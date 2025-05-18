const express = require('express');
const { userManagementController } = require('../../controllers/index');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/getAllModules', auth(), userManagementController.getAllModules);
router.get('/getAllRoles', auth(), userManagementController.getAllRoles);
router.post('/createRole', auth(), userManagementController.createRole);
router.delete('/deleteRole/:roleId', auth(), userManagementController.deleteRole);
router.post('/createModule', auth(), userManagementController.createModule);
router.post('/updateRolePrivileges', auth(), userManagementController.updateRolePrivileges);
router.post('/createRoleWithModules', auth(), userManagementController.createRoleWithModules);
router.get('/getPrivilegesByRoleName/:roleName', auth(), userManagementController.getPrivilegesByRoleName);
router.get(
  '/getPrivilegesByRoleNameWithoutPopulation/:roleName',
  auth(),
  userManagementController.getPrivilegesByRoleNameWithoutPopulation
);

module.exports = router;
