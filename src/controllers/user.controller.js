const httpStatus = require('http-status');
const mongoose = require('mongoose');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { roleKeyValue } = require('../config/roles');
const { tokenService, emailService, userService, farmService, activityLogService } = require('../services/index');
const { activityLogsActions, accountStatusTypes } = require('../utils/constants');
const { convertToObjectId } = require('../utils/helper');

const getAllUsers = catchAsync(async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = mongoose.Types.ObjectId(req.user._id);

    const filter = pick(req.query, ['search', 'role', 'accountStatus']);
    let caseInsensitiveFilter = {};

    if (userRole === 'superAdmin') {
      // Super Admin sees all users except themselves
      caseInsensitiveFilter = { _id: { $ne: userId } };
    } else if (userRole === 'businessAccount') {
      // Business Admin sees users matching the businessAccountRef field with their user ID
      caseInsensitiveFilter = { businessAccountRef: userId };
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const aggregateQuery = [
      { $match: caseInsensitiveFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'businessAccountRef',
          foreignField: '_id',
          as: 'businessAccountRefDetails',
        },
      },
      {
        $unwind: {
          path: '$businessAccountRefDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'contractorBusinessAccountRefs',
          foreignField: '_id',
          as: 'contractorBusinessAccountRefsDetails',
        },
      },
      // {
      //   $unwind: {
      //     path: '$contractorBusinessAccountRefsDetails',
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      {
        $addFields: {
          businessAccountName: {
            $cond: {
              if: { $eq: ['$businessAccountRef', null] },
              then: '$businessAccountName', // Use existing businessAccountName value
              else: '$businessAccountRefDetails.businessAccountName',
            },
          },
        },
      },
    ];

    if (filter.search) {
      aggregateQuery.push({
        $match: {
          $or: [
            { fullName: { $regex: new RegExp(filter.search, 'i') } },
            { businessAccountName: { $regex: new RegExp(filter.search, 'i') } },
            { email: { $regex: new RegExp(filter.search, 'i') } },
          ],
        },
      });
    }

    if (filter.accountStatus) {
      if (filter.accountStatus === accountStatusTypes.archived) {
        aggregateQuery.push({
          $match: {
            isArchived: true,
          },
        });
      } else if (filter.accountStatus === accountStatusTypes.active) {
        aggregateQuery.push({
          $match: {
            isApproved: true,
            isArchived: false,
          },
        });
      } else if (filter.accountStatus === accountStatusTypes.deactive) {
        aggregateQuery.push({
          $match: {
            isApproved: false,
            isArchived: false,
          },
        });
      }
    } else {
      // All
      aggregateQuery.push({
        $match: {
          isArchived: false,
        },
      });
    }

    if (filter.role) {
      aggregateQuery.push({
        $match: { role: { $eq: filter.role } },
      });
    }

    const result = await userService.queryUsersAggregated(caseInsensitiveFilter, options, aggregateQuery);

    res.send(result);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getUserById = catchAsync(async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getBusinessAccounts = catchAsync(async (req, res) => {
  try {
    const users = await userService.getBusinessAccounts(req.user);
    res.send(users);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createUser = catchAsync(async (req, res) => {
  try {
    const { farmId, email, role, contractorFarmId, contractorBusinessAccountRefs, existingContractor } = req.body;

    let user = null;

    if (role === roleKeyValue.contractor) {
      if (existingContractor) {
        // Fetch user and assign
        user = await userService.getUserById(existingContractor);
      } else {
        user = await userService.createUser({
          ...req.body,
          contractorBusinessAccountRefs: contractorBusinessAccountRefs.map((elem) => elem.value),
        });
      }
    } else {
      user = await userService.createUser(req.body);
    }

    /**
     * Update Farm doc with respective user ref
     */
    if (user.role === roleKeyValue.user) {
      const farm = await farmService.getFarmByFarmId(farmId);
      await farmService.updateFarm(farmId, {
        userRef: user._id,
      });
      // Create activity log
      await activityLogService.createActivityLog({
        action: activityLogsActions.user_added_to_farm,
        createdByUser: req.user._id,
        actionDetails: `User added to Farm ${farmId}`,
        actionObject: {
          _id: user._id,
          businessAccountRef: convertToObjectId(farm.businessAccountRef),
        },
      });
      // Todo: Create activity log for user_added_to_farm
    } else if (user.role === roleKeyValue.farmManager) {
      const farm = await farmService.getFarmByFarmId(farmId);
      await farmService.updateFarm(farmId, {
        farmManagerRef: user._id,
      });
      await activityLogService.createActivityLog({
        action: activityLogsActions.farm_manager_assigned_to_farm,
        createdByUser: req.user._id,
        actionDetails: `Farm manager assigned to Farm ${farmId}`,
        actionObject: {
          _id: user._id,
          businessAccountRef: convertToObjectId(farm.businessAccountRef),
        },
      });
      // Todo: Create activity log for farm_manager_assigned_to_farm
    } else if (user.role === roleKeyValue.businessAccount) {
      // Super admin is creating the Business Account
      if (farmId) {
        await farmService.updateFarm(farmId, {
          businessAccountRef: user._id,
        });
      }

      await activityLogService.createActivityLog({
        action: activityLogsActions.userCreated,
        createdByUser: req.user._id,
        actionDetails: `${user.businessAccountName} business account created`,
        actionObject: {
          _id: user._id,
          businessAccountRef: null,
        },
      });
    } else if (user.role === roleKeyValue.contractor) {
      for (let index = 0; index < contractorFarmId.length; index += 1) {
        const farm = contractorFarmId[index];

        await farmService.updateFarm(farm.value, {
          contractorRef: user._id,
        });
      }

      await activityLogService.createActivityLog({
        action: activityLogsActions.contractor_assigned_to_farm,
        createdByUser: req.user._id,
        actionDetails: `Contractor assigned to Farm ${contractorFarmId.map((elem) => elem.value).join(', ')}`,
        actionObject: {
          _id: user._id,
          businessAccountRef: null,
        },
      });
    }

    if (!user.isEmailVerified) {
      const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
      await emailService.sendVerificationEmail(email, verifyEmailToken);
    }

    res.status(httpStatus.OK).send({ user });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const updateCoverImg = catchAsync(async (req, res) => {
  try {
    const user = await userService.updateCoverImg(req.user._id, req.file.key);
    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const updateUserById = catchAsync(async (req, res) => {
  try {
    const user = await userService.updateUserById(req.user._id, req.body);
    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const updateUser = catchAsync(async (req, res) => {
  try {
    const { userId, role, farmId, contractorBusinessAccountRefs, contractorFarmId, existingContractor } = req.body;

    let user = null;

    if (role === roleKeyValue.contractor) {
      if (existingContractor) {
        const constractorDetails = await userService.getUserByIdRaw(existingContractor);
        const farm = await farmService.getFarmByFarmId(farmId);

        user = await userService.updateUserById(existingContractor, {
          ...req.body,
          contractorBusinessAccountRefs: constractorDetails.contractorBusinessAccountRefs.concat([
            mongoose.Types.ObjectId(farm.businessAccountRef._id),
          ]),
        });
      } else {
        user = await userService.updateUserById(userId, {
          ...req.body,
          contractorBusinessAccountRefsFullSet: contractorBusinessAccountRefs.map((elem) => elem.value),
        });
      }
    } else {
      user = await userService.updateUserById(userId, req.body);
    }

    if (user.role === roleKeyValue.user) {
      const farm = await farmService.getFarmByFarmId(farmId);

      await farmService.updateFarm(farmId, {
        userRef: user._id,
      });

      // Updated user Activity Log
      await activityLogService.createActivityLog({
        action: activityLogsActions.userUpdated,
        createdByUser: req.user._id,
        actionDetails: `${user.fullName}'s account has been updated`,
        actionObject: {
          _id: user._id,
          businessAccountRef: convertToObjectId(farm.businessAccountRef),
        },
      });
    } else if (user.role === roleKeyValue.farmManager) {
      const farm = await farmService.getFarmByFarmId(farmId);

      await farmService.updateFarm(farmId, {
        farmManagerRef: user._id,
      });
      await activityLogService.createActivityLog({
        action: activityLogsActions.userUpdated,
        createdByUser: req.user._id,
        actionDetails: `${user.fullName}'s account has been updated`,
        actionObject: {
          _id: user._id,
          businessAccountRef: convertToObjectId(farm.businessAccountRef),
        },
      });
    } else if (user.role === roleKeyValue.businessAccount) {
      // Super admin is creating the Business Account
      if (farmId) {
        await farmService.updateFarm(farmId, {
          businessAccountRef: user._id,
        });
      }

      await activityLogService.createActivityLog({
        action: activityLogsActions.userUpdated,
        createdByUser: req.user._id,
        actionDetails: `${user.businessAccountName}'s has been updated`,
        actionObject: {
          _id: user._id,
          businessAccountRef: null,
        },
      });
    } else if (user.role === roleKeyValue.contractor) {
      if (existingContractor) {
        await farmService.updateFarm(farmId, {
          contractorRef: existingContractor,
        });

        await activityLogService.createActivityLog({
          action: activityLogsActions.contractor_assigned_to_farm,
          createdByUser: req.user._id,
          actionDetails: `Contractor assigned to Farm ${farmId}`,
          actionObject: {
            _id: user._id,
            businessAccountRef: null,
          },
        });
      } else {
        await farmService.removeContractorFromFarm(userId);

        const currentFarmsOfContractor = await farmService.getCurrentFarmsOfContractor(
          user._id,
          contractorBusinessAccountRefs.map((elem) => elem.value)
        );

        // Deleting from all farms
        for (let index = 0; index < currentFarmsOfContractor.length; index += 1) {
          const { value } = currentFarmsOfContractor[index];

          await farmService.updateFarm(value, {
            contractorRef: null,
          });
        }

        // Adding to farms
        for (let index = 0; index < contractorFarmId.length; index += 1) {
          const farm = contractorFarmId[index];

          await farmService.updateFarm(farm.value, {
            contractorRef: user._id,
          });
        }

        await activityLogService.createActivityLog({
          action: activityLogsActions.contractor_assigned_to_farm,
          createdByUser: req.user._id,
          actionDetails: `Contractor assigned to Farm ${contractorFarmId.map((elem) => elem.value).join(', ')}`,
          actionObject: {
            _id: user._id,
            businessAccountRef: null,
          },
        });
      }
    }

    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const toggleUserAccountStatus = catchAsync(async (req, res) => {
  try {
    const user = await userService.toggleUserAccountStatus(req.params.userId);

    // User Activated/Deactivated activity log
    await activityLogService.createActivityLog({
      action: user.isApproved ? activityLogsActions.userActivated : activityLogsActions.userDeactivated,
      createdByUser: req.user._id,
      actionDetails: `${user.fullName}'s account has been ${user.isApproved ? 'activated' : 'deactivated'}`,
      actionObject: {
        _id: user._id,
        businessAccountRef: convertToObjectId(user.businessAccountRef),
      },
    });

    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const toggleUserEmailVerification = catchAsync(async (req, res) => {
  try {
    const user = await userService.toggleUserEmailVerification(req.params.userId);
    res.send(user);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const deleteUser = catchAsync(async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userService.getUserById(userId);

    switch (user.role) {
      case roleKeyValue.user:
        await farmService.removeUserFromFarm(userId);
        await userService.deleteUserById(userId);

        break;

      case roleKeyValue.farmManager:
        await farmService.removeFarmManagerFromFarm(userId);
        await userService.deleteUserById(userId);

        break;

      case roleKeyValue.contractor:
        await farmService.removeContractorFromFarm(userId);
        await userService.deleteUserById(userId);

        break;

      case roleKeyValue.businessAccount:
        // Business Account won't be deleted permanantly rather it'll be archived
        await userService.toggleBusinessAccountArchiveStatus(userId);

        break;

      default:
        break;
    }

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const deleteBusinessAccountPermanantly = catchAsync(async (req, res) => {
  try {
    const { businessAccountRef } = req.params;

    await farmService.deleteFarmsByBusinessAccRef(businessAccountRef);
    await userService.deleteFarmManagersAndUsersByBusinessAccuntRef(businessAccountRef);
    await userService.removeContractorFromBusinessAcc(businessAccountRef);
    await userService.deleteUserById(businessAccountRef);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const getAllUsersByRole = catchAsync(async (req, res) => {
  try {
    const { role } = req.params;
    const users = await userService.getAllUsersByRole(role);
    res.send(users);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const toggleBusinessAccountArchiveStatus = catchAsync(async (req, res) => {
  try {
    const { businessAccountRef } = req.params;
    const users = await userService.toggleBusinessAccountArchiveStatus(businessAccountRef);
    res.send(users);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  getBusinessAccounts,
  createUser,
  updateUser,
  toggleUserAccountStatus,
  toggleUserEmailVerification,
  deleteUser,
  deleteBusinessAccountPermanantly,
  updateUserById,
  updateCoverImg,
  getAllUsersByRole,
  toggleBusinessAccountArchiveStatus,
};
