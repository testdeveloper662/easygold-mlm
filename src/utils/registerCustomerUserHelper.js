const db = require("../models");

/**
 * Ensures that a registered customer has an entry in 6LWUP_users (with role_id 5)
 * and in user_referrals (with proper parent_user_id reference).
 *
 * @param {Object} targetCustomer - The TargetCustomers model instance or plain object
 * @param {Object|null} transaction - Optional Sequelize transaction object
 * @returns {Promise<Object|null>}
 */
const registerCustomerUser = async (targetCustomer, transaction = null) => {
  try {
    if (!targetCustomer || !targetCustomer.customer_email) return null;

    const options = transaction ? { transaction } : {};
    const email = String(targetCustomer.customer_email).trim().toLowerCase();
    const customerName = targetCustomer.customer_name ? String(targetCustomer.customer_name).trim() : email.split("@")[0];

    // 1. Check if user already exists in 6LWUP_users by email
    let user = await db.Users.findOne({
      where: { user_email: email },
      ...options,
    });

    // Find customer role id (default to 5)
    let customerRole = await db.Seeder.findOne({
      where: { user_type: "customer" },
      ...options,
    });

    const customerRoleId = customerRole ? customerRole.id : 5;

    if (!user) {
      user = await db.Users.create(
        {
          user_login: email,
          user_pass: "",
          user_nicename: customerName.replace(/\s+/g, "_"),
          user_email: email,
          user_registered: new Date(),
          user_status: 2,
          display_name: customerName,
          user_type: 0,
          role_id: customerRoleId,
        },
        options
      );
    } else {
      // Ensure role_id is set to 5 if not set or if updating
      if (!user.role_id) {
        await user.update({ role_id: customerRoleId }, options);
      }
    }

    const userId = user.ID;

    // 2. Resolve parent_user_id for UserReferrals & parent_id for Brokers
    let parentUserId = null;
    let parentBrokerId = null;

    // A: Resolve parent broker ID from referred_by_code if available
    let referralCode = targetCustomer.referral_code || null;
    const referredByCode = targetCustomer.referred_by_code || null;

    const generateUniqueCode = async () => {
      let code;
      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        code = "ref" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const existingRef = await db.UserReferrals.findOne({
          where: { referral_code: code },
          ...options,
        });
        if (!existingRef) return code;
      }
      return "ref" + Date.now().toString(36).toUpperCase();
    };

    if (!referralCode) {
      referralCode = await generateUniqueCode();
      if (typeof targetCustomer.update === "function") {
        await targetCustomer.update({ referral_code: referralCode }, options);
      } else if (targetCustomer.id) {
        await db.TargetCustomers.update(
          { referral_code: referralCode },
          { where: { id: targetCustomer.id }, ...options }
        );
        targetCustomer.referral_code = referralCode;
      }
    }

    if (referredByCode) {
      const pBroker = await db.Brokers.findOne({
        where: { referral_code: referredByCode },
        raw: true,
        ...options,
      });
      if (pBroker) {
        parentBrokerId = pBroker.id;
        parentUserId = pBroker.user_id;
      }
    }

    // B: If parent_customer_id is set on targetCustomer
    if (targetCustomer.parent_customer_id) {
      const parentCustomer = await db.TargetCustomers.findByPk(
        targetCustomer.parent_customer_id,
        options
      );
      if (parentCustomer && parentCustomer.customer_email) {
        const parentUser = await db.Users.findOne({
          where: { user_email: String(parentCustomer.customer_email).trim().toLowerCase() },
          ...options,
        });
        if (parentUser) {
          if (!parentUserId) parentUserId = parentUser.ID;

          if (!parentBrokerId) {
            const pBroker = await db.Brokers.findOne({
              where: { user_id: parentUser.ID },
              raw: true,
              ...options,
            });
            if (pBroker) parentBrokerId = pBroker.id;
          }
        }
      }
    }

    // C: If referral_code_id is set on targetCustomer (id in user_referrals table)
    if (!parentUserId && targetCustomer.referral_code_id) {
      const userRef = await db.UserReferrals.findOne({
        where: { id: targetCustomer.referral_code_id },
        raw: true,
        ...options,
      });
      if (userRef) {
        parentUserId = userRef.user_id;
      }
    }

    // D: If broker_id is set on targetCustomer
    if (targetCustomer.broker_id) {
      const broker = await db.Brokers.findOne({
        where: { id: targetCustomer.broker_id },
        raw: true,
        ...options,
      });
      if (broker) {
        if (!parentUserId) parentUserId = broker.user_id;
        if (!parentBrokerId) parentBrokerId = broker.id;
      }
    }

    // E: If referred_by_code was not resolved to a broker yet
    if (!parentUserId && referredByCode) {
      const userRef = await db.UserReferrals.findOne({
        where: { referral_code: referredByCode },
        raw: true,
        ...options,
      });
      if (userRef) {
        parentUserId = userRef.user_id;
      } else if (db.Affiliates) {
        const affiliate = await db.Affiliates.findOne({
          where: { referral_code: referredByCode },
          raw: true,
          ...options,
        });
        if (affiliate) {
          parentUserId = affiliate.user_id;
        }
      }
    }

    // Prevent self-referral
    if (parentUserId === userId) {
      parentUserId = null;
    }

    // 3. Create or update Brokers record for customer if referral code / referred_by code exists
    let brokerRecord = null;
    if (referralCode || referredByCode || targetCustomer.broker_id) {
      brokerRecord = await db.Brokers.findOne({
        where: { user_id: userId },
        ...options,
      });

      if (brokerRecord && parentBrokerId === brokerRecord.id) {
        parentBrokerId = null; // prevent self-referral in Brokers table
      }

      if (!brokerRecord) {
        brokerRecord = await db.Brokers.create(
          {
            user_id: userId,
            referral_code: referralCode,
            referred_by_code: referredByCode,
            parent_id: parentBrokerId,
            children_count: 0,
          },
          options
        );
      } else {
        await brokerRecord.update(
          {
            referral_code: referralCode || brokerRecord.referral_code,
            referred_by_code: referredByCode || brokerRecord.referred_by_code,
            parent_id: parentBrokerId || brokerRecord.parent_id,
          },
          options
        );
      }
    }

    // 4. Create or update UserReferrals record for customer
    let userRefRecord = await db.UserReferrals.findOne({
      where: { user_id: userId },
      ...options,
    });

    if (!userRefRecord) {
      userRefRecord = await db.UserReferrals.create(
        {
          user_id: userId,
          referral_code: referralCode,
          referred_by_code: referredByCode,
          parent_user_id: parentUserId,
          children_count: 0,
        },
        options
      );
    } else {
      await userRefRecord.update(
        {
          referral_code: referralCode || userRefRecord.referral_code,
          referred_by_code: referredByCode || userRefRecord.referred_by_code,
          parent_user_id: parentUserId || userRefRecord.parent_user_id,
        },
        options
      );
    }

    // 5. Ensure targetCustomer has ITS OWN referral_code_id pointing to ITS OWN user_referrals record
    if (userRefRecord && userRefRecord.id) {
      const selfRefId = userRefRecord.id;
      const selfRefCode = userRefRecord.referral_code || referralCode;
      if (typeof targetCustomer.update === "function") {
        await targetCustomer.update(
          {
            referral_code_id: selfRefId,
            referral_code: selfRefCode,
          },
          options
        );
      } else if (targetCustomer.id) {
        await db.TargetCustomers.update(
          {
            referral_code_id: selfRefId,
            referral_code: selfRefCode,
          },
          { where: { id: targetCustomer.id }, ...options }
        );
        targetCustomer.referral_code_id = selfRefId;
        targetCustomer.referral_code = selfRefCode;
      }
    }

    return { user, brokerRecord, userRefRecord };
  } catch (err) {
    console.error("Error in registerCustomerUser helper:", err.message);
    return null;
  }
};

module.exports = { registerCustomerUser };
