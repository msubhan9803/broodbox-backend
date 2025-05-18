const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { roleKeyValue } = require('../config/roles');
const message = require('../utils/message');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, message.EmailAlreadyTaken);
  }

  if (userBody.password) {
    userBody.isEmailVerified = true;
  }

  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Query for users aggregated
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsersAggregated = async (filter, options, aggregateQuery) => {
  const users = await User.aggregatedPaginate(filter, options, aggregateQuery);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id).populate('contractorBusinessAccountRefs');
};

/**
 * Get user by id (raw)
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserByIdRaw = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Get Business Accounts
 * @param {string} userId
 * @returns {Promise<User[]>}
 */
const getBusinessAccounts = async (user) => {
  let query;

  switch (user.role) {
    case roleKeyValue.superAdmin:
      query = { role: roleKeyValue.businessAccount };
      break;

    case roleKeyValue.businessAccount:
      query = { _id: mongoose.Types.ObjectId(user._id) };
      break;

    case roleKeyValue.user:
    case roleKeyValue.farmManager:
      query = { _id: mongoose.Types.ObjectId(user.businessAccountRef) };
      break;

    case roleKeyValue.contractor:
      query = { _id: { $in: user.contractorBusinessAccountRefs } };
      break;

    default:
      return [];
  }

  return User.find(query);
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  let user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, message.EmailAlreadyTaken);
  }

  if (updateBody.firstName || updateBody.lastName) {
    const firstName = updateBody.firstName || user.firstName;
    const lastName = updateBody.lastName || user.lastName;
    if (user.role !== roleKeyValue.businessAccount) {
      user.fullName = `${firstName} ${lastName}`.trim();
    }
  }

  // Directly set contractorBusinessAccountRefs if provided
  if (updateBody.contractorBusinessAccountRefsFullSet) {
    updateBody.contractorBusinessAccountRefs = updateBody.contractorBusinessAccountRefsFullSet.map((id) =>
      mongoose.Types.ObjectId(id)
    );
  }

  Object.assign(user, updateBody);
  user = await user.save();
  return user;
};

/**
 * Toggle User Account Status
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const toggleUserAccountStatus = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }

  Object.assign(user, { isApproved: !user.isApproved });
  await user.save();

  return user;
};

const updateCoverImg = async (userId, key) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }
  const options = { new: true }; // Return the updated document
  const updatedBody = { profileImageUrl: `http://51.20.39.36/api/v1/S3/getMedia/${key}` };
  const updatedUser = await User.findByIdAndUpdate(userId, updatedBody, options);
  return updatedUser;
};

/**
 * Toggle User Email Verification
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const toggleUserEmailVerification = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }

  Object.assign(user, { isEmailVerified: !user.isEmailVerified });
  await user.save();

  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }
  await user.remove();
  return user;
};

/**
 * Delete users by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteFarmManagersAndUsersByBusinessAccuntRef = async (businessAccountRef) => {
  await User.deleteMany({ businessAccountRef });
};

/**
 * Get All Users By Role
 * @returns {Promise<User>}
 */
const getAllUsersByRole = async (role) => {
  return User.find({ role });
};

/**
 * Toggle Business Account Archive Status
 * @param {ObjectId} businessAccountRef
 * @returns {Promise<User>}
 */
const toggleBusinessAccountArchiveStatus = async (businessAccountRef) => {
  const user = await getUserById(businessAccountRef);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, message.UserNotFound);
  }

  Object.assign(user, { isArchived: !user.isArchived });
  await user.save();

  return user;
};

/**
 * Remove Contractor from Business Acc
 * @param {ObjectId} businessAccountRef
 * @returns {Promise<User>}
 */
const removeContractorFromBusinessAcc = async (businessAccountRef) => {
  await User.updateMany(
    { contractorBusinessAccountRefs: businessAccountRef },
    { $pull: { contractorBusinessAccountRefs: businessAccountRef } },
    { new: true, multi: true }
  );
};

module.exports = {
  createUser,
  queryUsers,
  queryUsersAggregated,
  getUserById,
  getUserByIdRaw,
  getUserByEmail,
  getBusinessAccounts,
  updateUserById,
  toggleUserAccountStatus,
  toggleUserEmailVerification,
  deleteUserById,
  deleteFarmManagersAndUsersByBusinessAccuntRef,
  updateCoverImg,
  getAllUsersByRole,
  toggleBusinessAccountArchiveStatus,
  removeContractorFromBusinessAcc,
};
