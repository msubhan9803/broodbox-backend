const httpStatus = require('http-status');
const { userManagementService } = require('../services/index');
const catchAsync = require('../utils/catchAsync');
const { ResourceDeleted, ResourceNotFound } = require('../utils/message');
const ApiError = require('../utils/ApiError');

const getAllModules = catchAsync(async (req, res) => {
  try {
    const modules = await userManagementService.getAllModules();

    res.status(httpStatus.OK).send({ modules });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getAllRoles = catchAsync(async (req, res) => {
  try {
    const roles = await userManagementService.getAllRoles();
    if (!roles) {
      throw new ApiError(httpStatus.NOT_FOUND, ResourceNotFound);
    }
    res.status(httpStatus.OK).send(roles);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createRole = catchAsync(async (req, res) => {
  try {
    const role = await userManagementService.createRole(req.body);
    res.status(httpStatus.OK).send(role);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const deleteRole = catchAsync(async (req, res) => {
  try {
    await userManagementService.deleteRole(req.params.roleId);
    res.status(httpStatus.OK).send({ message: ResourceDeleted });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createModule = catchAsync(async (req, res) => {
  try {
    const module = await userManagementService.createModule(req.body);

    res.status(httpStatus.OK).send(module);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const updateRolePrivileges = catchAsync(async (req, res) => {
  try {
    const module = await userManagementService.updateRolePrivileges(req.body);

    res.status(httpStatus.OK).send(module);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getPrivilegesByRoleName = catchAsync(async (req, res) => {
  try {
    const module = await userManagementService.getPrivilegesByRoleName(req.params.roleName);

    res.status(httpStatus.OK).send(module);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getPrivilegesByRoleNameWithoutPopulation = catchAsync(async (req, res) => {
  try {
    const module = await userManagementService.getPrivilegesByRoleNameWithoutPopulation(req.params.roleName);

    res.status(httpStatus.OK).send(module);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createRoleWithModules = catchAsync(async (req, res) => {
  try {
    const { role, moduleList } = req.body;
    const module = await userManagementService.createRoleWithModules(role, moduleList);

    res.status(httpStatus.OK).send(module);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

module.exports = {
  getAllModules,
  getAllRoles,
  createRole,
  deleteRole,
  createModule,
  updateRolePrivileges,
  getPrivilegesByRoleName,
  getPrivilegesByRoleNameWithoutPopulation,
  createRoleWithModules,
};
