const { sequelize } = require("../config/db");

function initModels() {
  // Phase 1: Independent Tables
  require("./location.model");
  require("./facility.model");
  require("./roomType.model");
  require("./assetType.model");

  // Phase 2: Core Tables
  require("./university.model");
  require("./user.model");
  require("./building.model");

  // Phase 3: Infrastructure & Profiles
  require("./buildingImage.model");
  require("./buildingFacility.model");
  require("./room.model");
  require("./authProvider.model");
  require("./customerProfile.model");
  require("./refreshToken.model");
  require("./otpCode.model");
  require("./contractTemplate.model");

  // Phase 4: Room Details & Assets
  require("./roomImage.model");
  require("./asset.model");
  require("./roomTypeAsset.model");

  // Phase 5: Business Core
  require("./contract.model");
  require("./assetHistory.model");
  require("./assetInspection.model");
  require("./assetInspectionItem.model");

  // Phase 6: Operational & Financial (Part 1)
  require("./contractExtension.model");
  require("./invoice.model");
  require("./settlement.model");
  require("./settlementItem.model");
  require("./violationPenalty.model");

  // Phase 7: Financial & Details (Part 2)
  require("./payment.model");
  require("./invoiceItem.model");
  require("./booking.model");
  require("./request.model");
  require("./requestImage.model");
  require("./requestStatusHistory.model");

  // Phase 8: System & Communications
  require("./notification.model");
  require("./notificationRecipient.model");
  require("./auditLog.model");
  require("./scheduledJob.model");
  require("./emailTemplate.model");
  require("./emailLog.model");

  Object.keys(sequelize.models).forEach((modelName) => {
    const model = sequelize.models[modelName];
    if (model.associate) {
      model.associate(sequelize.models);
    }
  });

  return sequelize.models;
}

module.exports = { initModels };
