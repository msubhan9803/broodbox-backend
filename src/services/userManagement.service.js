const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Role, Module, Screen, Action, Privilege, User } = require('../models/index');
const ApiError = require('../utils/ApiError');
const { ResourceNotFound } = require('../utils/message');

/**
 * Get all Roles
 * @returns {Promise<roles>}
 */
const getAllRoles = async () => {
  const roles = Role.find();
  if (!roles) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  return roles;
};

/**
 * Create a Role
 * @returns {Promise<roles>}
 */
const createRole = async (body) => {
  const roles = Role.create(body);
  if (!roles) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  return roles;
};

/**
 * Delete a Role
 * @returns {Promise<roles>}
 */
const deleteRole = async (roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }

  await Role.deleteOne({ _id: roleId });
};

/**
 * Get all Modules with their screens and actions
 * @returns {Promise<Modules>}
 */
const getAllModules = async () => {
  const modules = await Module.aggregate([
    {
      $lookup: {
        from: 'screens', // This should match the actual name of the screens collection in the database
        localField: '_id',
        foreignField: 'moduleRef',
        as: 'screens',
      },
    },
    {
      // Populate the defaultScreen
      $lookup: {
        from: 'screens', // This should match the actual name of the screens collection
        localField: 'defaultScreen',
        foreignField: '_id',
        as: 'defaultScreenDoc',
      },
    },
    {
      $unwind: {
        path: '$screens',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'actions', // This should match the actual name of the actions collection
        localField: 'screens.actionsList.actionRef',
        foreignField: '_id',
        as: 'screens.actionsList',
      },
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        label: { $first: '$label' },
        defaultScreenDoc: { $first: '$defaultScreenDoc' },
        icon: { $first: '$icon' },
        status: { $first: '$status' },
        order: { $first: '$order' },
        screens: { $push: '$screens' },
      },
    },
    {
      $addFields: {
        defaultScreen: { $arrayElemAt: ['$defaultScreenDoc', 0] },
      },
    },
    {
      $project: {
        defaultScreenDoc: 0, // Remove the intermediate defaultScreenDoc field
      },
    },
  ]);

  return modules;
};

/**
 * Function to create a role with modules, screens, and actions
 * @returns {Promise<roles>}
 */
const createRoleWithModules = async (role, moduleList) => {
  let roleDoc = await Role.findOne({ role });
  if (!roleDoc) {
    roleDoc = new Role({ role });
    await roleDoc.save();
  }

  const moduleRefs = [];
  for (const moduleItem of moduleList) {
    let moduleDoc = await Module.findOne({ name: moduleItem.name });
    let moduleDocRef;
    if (!moduleDoc) {
      // At this point, we don't set the defaultScreen yet because we don't have the screen ID.
      const newModule = new Module({
        name: moduleItem.name,
        label: moduleItem.label,
        icon: moduleItem.icon,
        status: moduleItem.status,
        order: moduleItem.order,
      });
      // The defaultScreen will be set later.
      moduleDocRef = newModule._id;
      moduleDoc = newModule; // Keep the document reference for later update.
    } else {
      moduleDocRef = moduleDoc._id;
    }

    const screenRefs = [];
    for (const [index, screenItem] of moduleItem.screenList.entries()) {
      let screenDoc = await Screen.findOne({ name: screenItem.name, moduleRef: moduleDocRef });
      if (!screenDoc) {
        screenDoc = new Screen({ ...screenItem, moduleRef: moduleDocRef });
        await screenDoc.save();
      }

      // If it's the first screen, set it as the defaultScreen for the module.
      if (index === 0) {
        moduleDoc.defaultScreen = screenDoc._id;
      }

      const actionRefs = [];
      for (const actionItem of screenItem.actionList) {
        let actionDoc = await Action.findOne({ actionId: actionItem.actionId });
        if (!actionDoc) {
          actionDoc = new Action(actionItem);
          await actionDoc.save();
        }
        actionRefs.push({ actionRef: actionDoc._id });
      }

      screenDoc.actionsList = actionRefs;
      await screenDoc.save();
      screenRefs.push({ screenRef: screenDoc._id, actionList: actionRefs });
    }

    // Save or update the module document after setting the defaultScreen.
    await moduleDoc.save();

    moduleRefs.push({ moduleRef: moduleDocRef, screenList: screenRefs });
  }

  let privilege = await Privilege.findOne({ role: roleDoc.role });
  if (privilege) {
    privilege.moduleList = moduleRefs;
    await privilege.save();
  } else {
    privilege = new Privilege({ role: roleDoc.role, moduleList: moduleRefs });
    await privilege.save();
  }

  return privilege;
};

/**
 * Create or update a Module.
 */
const createModule = async (payload) => {
  const { name, label, screenList, icon } = payload;

  // Check if module exists, update if it does, create otherwise
  let module = await Module.findOne({ name });
  if (module) {
    await Module.findByIdAndUpdate(module._id, { label, icon });
  } else {
    module = new Module({ name, label, icon });
    await module.save();
  }

  // Iterate over each screen in the screenList
  for (const screen of screenList) {
    let newScreen = await Screen.findOne({ moduleRef: module._id, name: screen.name });
    if (newScreen) {
      // Update existing screen
      newScreen.label = screen.label;
      newScreen.url = screen.url;
    } else {
      // Create new screen
      newScreen = new Screen({
        moduleRef: module._id,
        name: screen.name,
        label: screen.label,
        url: screen.url,
        actionsList: [], // Initialize actions list
      });
    }

    // Create or update actions for each screen
    for (const action of screen.actionList) {
      let actionDoc = await Action.findOne({ actionId: action.actionId });
      if (!actionDoc) {
        // Create new action if it doesn't exist
        actionDoc = new Action({
          actionId: action.actionId,
          actionName: action.actionName,
        });
        await actionDoc.save();
      }

      // Add or update action reference in the screen's actionsList
      const actionRefExists = newScreen.actionsList.some((aRef) => aRef.actionRef.equals(actionDoc._id));
      if (!actionRefExists) {
        newScreen.actionsList.push({ actionRef: actionDoc._id });
      }
    }

    // Save or update the screen document
    await newScreen.save();
  }

  return module;
};

/**
 * Create Privileges
 */
const updateRolePrivileges = async (payload) => {
  const { role, moduleList } = payload;

  // Find or create the role
  let roleDoc = await Role.findOne({ role });
  if (!roleDoc) {
    roleDoc = new Role({ role });
    await roleDoc.save();
  }

  // Iterate over each module in the moduleList
  const moduleRefs = [];
  for (const moduleItem of moduleList) {
    const moduleDoc = await Module.findById(moduleItem.moduleRef);
    if (!moduleDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, `Module not found with id: ${moduleItem.moduleRef}`);
    }

    // Process screens and actions
    const screenRefs = [];
    for (const screenItem of moduleItem.screenList) {
      const screenDoc = await Screen.findById(screenItem.screenRef);
      if (!screenDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, `Screen not found with id: ${screenItem.screenRef}`);
      }

      const actionRefs = screenItem.actionList.map((action) => {
        return { actionRef: mongoose.Types.ObjectId(action.actionRef) };
      });

      screenRefs.push({ screenRef: screenDoc._id, actionList: actionRefs });
    }

    moduleRefs.push({ moduleRef: moduleDoc._id, screenList: screenRefs });
  }

  // Create or update privilege
  let privilege = await Privilege.findOne({ role });
  if (privilege) {
    privilege.moduleList = moduleRefs;
    await privilege.save();
  } else {
    privilege = new Privilege({ role, moduleList: moduleRefs });
    await privilege.save();
  }

  return privilege;
};

/**
 * Get Privileges By Role Name
 */
const getPrivilegesByRoleName = async (roleName) => {
  try {
    // Find the role document
    const role = await Role.findOne({ role: roleName });
    if (!role) {
      throw new ApiError(httpStatus.NOT_FOUND, ResourceNotFound);
    }

    // Retrieve privilege by role reference and populate module and screen details
    const privilege = await Privilege.findOne({ role: roleName })
      .populate({
        path: 'moduleList.moduleRef',
        model: 'Module',
        populate: {
          // Nested populate for defaultScreen
          path: 'defaultScreen',
          model: 'Screen',
        },
      })
      .populate({
        path: 'moduleList.screenList.screenRef',
        model: 'Screen',
      })
      .populate({
        path: 'moduleList.screenList.actionList.actionRef',
        model: 'Action',
      });

    if (!privilege) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Privilege not found');
    }

    // Remove the actionList field from screenRef
    privilege.moduleList.forEach((module) => {
      module.screenList.forEach((screen) => {
        screen.screenRef.actionsList = undefined;
      });
    });

    return privilege;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Get Privileges By Role Name Without Population
 */
const getPrivilegesByRoleNameWithoutPopulation = async (roleName) => {
  try {
    const role = await Role.findOne({ role: roleName });
    if (!role) {
      throw new ApiError(httpStatus.NOT_FOUND, ResourceNotFound);
    }

    const privilege = await Privilege.findOne({ role: roleName });

    if (!privilege) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Privilege not found');
    }

    privilege.moduleList.forEach((module) => {
      module.screenList.forEach((screen) => {
        screen.screenRef.actionsList = undefined;
      });
    });

    return privilege;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/*
 * Get all users
 */
const getAllUsers = async () => {
  try {
    const users = await User.find();
    if (!users) {
      throw new ApiError(httpStatus.NOT_FOUND, ResourceNotFound);
    }
    return users;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/*
 * Create a user
 */

const createUser = async (body) => {
  try {
    const user = await User.create(body);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, ResourceNotFound);
    }
    return user;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

module.exports = {
  getAllRoles,
  createRole,
  deleteRole,
  getAllModules,
  createRoleWithModules,
  createModule,
  updateRolePrivileges,
  getPrivilegesByRoleName,
  getPrivilegesByRoleNameWithoutPopulation,
  getAllUsers,
  createUser,
};
