const User = require('../models/user.model');
const CustomerProfile = require('../models/customerProfile.model');
const AppError = require('../utils/AppError');

const getProfileById = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'role', 'first_name', 'last_name', 'phone', 'avatar_url'],
    include: [{
      model: CustomerProfile,
      as: 'profile',
      attributes: ['id', 'gender', 'date_of_birth', 'permanent_address', 'emergency_contact_name', 'emergency_contact_phone']
    }]
  });

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  return user;
};

const USER_FIELDS = ['first_name', 'last_name', 'phone', 'avatar_url'];
const PROFILE_FIELDS = ['gender', 'date_of_birth', 'permanent_address', 'emergency_contact_name', 'emergency_contact_phone'];

const updateProfileById = async (userId, payload) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404, 'USER_NOT_FOUND');
  }

  // Update user fields
  const userData = {};
  USER_FIELDS.forEach((f) => { if (payload[f] !== undefined) userData[f] = payload[f]; });
  if (Object.keys(userData).length > 0) {
    await user.update(userData);
  }

  // Update or create customer profile
  const profileData = {};
  PROFILE_FIELDS.forEach((f) => { if (payload[f] !== undefined) profileData[f] = payload[f]; });
  if (Object.keys(profileData).length > 0) {
    const [profile] = await CustomerProfile.findOrCreate({
      where: { user_id: userId },
      defaults: { ...profileData, user_id: userId }
    });
    if (!profile.isNewRecord) {
      await profile.update(profileData);
    }
  }

  // Return full profile
  return getProfileById(userId);
};

module.exports = {
  getProfileById,
  updateProfileById
};
