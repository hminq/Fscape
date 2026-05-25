const { sequelize } = require("../config/db");
const AppError = require('../utils/AppError');
const bookingRepository = require("../repositories/booking.repository");
const {
  DEPOSIT_MONTHS,
  MIN_CHECKIN_DAYS,
  MAX_CHECKIN_DAYS,
  BOOKING_EXPIRY_MS,
} = require("../constants/booking");
const {
  isValidContractLength,
  isValidBookingBillingCycle,
} = require("../constants/bookingEnums");
const { normalizeBillingCycle } = require("../utils/billingCycle.util");
const { generateNumberedId } = require("../utils/generateId");
const { parseUTCDate } = require("../utils/date.util");

const createBooking = async (userId, bookingData) => {
  const {
    room_id,
    check_in_date,
    duration_months,
    billing_cycle,
    customer_info,
  } = bookingData;
  const resolvedDurationMonths = Number(duration_months);

  if (!isValidContractLength(resolvedDurationMonths)) {
    throw new AppError("Thời hạn hợp đồng chỉ hỗ trợ 6 hoặc 12 tháng.", 400);
  }

  // Validate check-in date within [today + MIN, today + MAX].
  const todayStr = new Date().toISOString().split('T')[0];
  const today = parseUTCDate(todayStr);
  const minCheckIn = new Date(today);
  minCheckIn.setUTCDate(minCheckIn.getUTCDate() + MIN_CHECKIN_DAYS);
  const maxCheckIn = new Date(today);
  maxCheckIn.setUTCDate(maxCheckIn.getUTCDate() + MAX_CHECKIN_DAYS);
  const checkIn = parseUTCDate(check_in_date);
  if (checkIn < minCheckIn || checkIn > maxCheckIn) {
    throw new AppError(`Ngày nhận phòng phải trong khoảng ${MIN_CHECKIN_DAYS}-${MAX_CHECKIN_DAYS} ngày kể từ hôm nay.`, 400);
  }

  // Validate billing cycle from user input
  const resolvedBillingCycle = normalizeBillingCycle(billing_cycle);
  if (!isValidBookingBillingCycle(resolvedBillingCycle)) {
    throw new AppError("Chu kỳ thanh toán không hợp lệ.", 400);
  }

  const transaction = await sequelize.transaction();
  let booking;

  try {
    // 1) Lock room row first.
    const room = await bookingRepository.findRoomForBooking(room_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!room) {
      throw new AppError("Không tìm thấy phòng.", 404);
    }

    if (room.status !== "AVAILABLE") {
      throw new AppError("Phòng này hiện không còn trống.", 400);
    }

    // 2) Fetch room type.
    const roomType = await bookingRepository.findRoomTypeById(room.room_type_id, {
      transaction,
    });
    const basePrice = Number(roomType?.base_price || 0);
    const depositAmount = basePrice * DEPOSIT_MONTHS;

    // 3) Upsert customer profile details.
    const [profile, created] = await bookingRepository.findOrCreateCustomerProfile(
      userId,
      {
        gender: customer_info?.gender?.toUpperCase(),
        date_of_birth: customer_info?.date_of_birth,
        permanent_address: customer_info?.permanent_address,
        emergency_contact_name: customer_info?.emergency_contact_name,
        emergency_contact_phone: customer_info?.emergency_contact_phone,
      },
      { transaction },
    );

    if (!created && customer_info) {
      await bookingRepository.updateCustomerProfile(
        profile,
        {
          gender: customer_info.gender?.toUpperCase() || profile.gender,
          date_of_birth: customer_info.date_of_birth || profile.date_of_birth,
          permanent_address:
            customer_info.permanent_address || profile.permanent_address,
          emergency_contact_name:
            customer_info.emergency_contact_name || profile.emergency_contact_name,
          emergency_contact_phone:
            customer_info.emergency_contact_phone ||
            profile.emergency_contact_phone,
        },
        { transaction },
      );
    }

    // 4) Create booking in PENDING status.
    booking = await bookingRepository.createPendingBooking(
      {
        booking_number: generateNumberedId("BK"),
        room_id,
        customer_id: userId,
        check_in_date,
        duration_months: resolvedDurationMonths,
        billing_cycle: resolvedBillingCycle,
        status: "PENDING",
        room_price_snapshot: basePrice,
        deposit_amount: depositAmount,
        expires_at: new Date(Date.now() + BOOKING_EXPIRY_MS),
      },
      { transaction },
    );

    // 5) Reserve room by setting LOCKED status.
    await bookingRepository.updateRoomInstanceStatus(room, "LOCKED", { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return booking;
};

const getMyBookings = async (userId, query = {}) => {
  const {
    page = 1,
    limit = 10,
  } = query;

  const { count, rows } = await bookingRepository.findMyBookings(userId, query);

  return {
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit),
    data: rows,
  };
};

const getBookingById = async (id, caller) => {
  const booking = await bookingRepository.findByIdWithDetails(id);

  if (!booking) throw new AppError("Không tìm thấy đơn đặt phòng.", 404);

  const role = caller.role || caller;
  if (role === 'BUILDING_MANAGER') {
    const bookingBuildingId = booking.room?.building?.id || booking.room?.building_id;
    if (!bookingBuildingId || bookingBuildingId !== caller.building_id) {
      throw new AppError("Bạn không có quyền truy cập đơn này.", 403);
    }
  } else if (role !== 'ADMIN') {
    if (booking.customer_id !== caller.id)
      throw new AppError("Bạn không có quyền truy cập đơn này.", 403);
  }

  return booking;
};
const getAllBookings = async (filters = {}, caller = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const repositoryOptions = {
        buildingId: caller.role === 'BUILDING_MANAGER' ? caller.building_id : undefined,
    };
    const { count, rows } = await bookingRepository.findAllWithFilters(filters, repositoryOptions);
    
    return {
        data: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            hasNextPage: page < Math.ceil(count / limit),
            hasPrevPage: page > 1
        }
    };
};

const cancelBookingForPaymentFailure = async (bookingId) => {
  const transaction = await sequelize.transaction();

  try {
    const booking = await bookingRepository.findByIdForUpdate(bookingId, transaction);

    if (!booking || booking.status !== "PENDING") {
      await transaction.rollback();
      return false;
    }

    await bookingRepository.updateBooking(
      booking,
      {
        status: "CANCELLED",
        cancelled_at: new Date(),
        cancellation_reason: "Không thể khởi tạo thanh toán",
      },
      { transaction },
    );

    await bookingRepository.updateRoomStatus(booking.room_id, "AVAILABLE", { transaction });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  getAllBookings,
  cancelBookingForPaymentFailure,
};
