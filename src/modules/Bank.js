const BankModel = require('../db/models/bank');
const moment = require('moment');

class Bank {
  /**
   * Create bank that belongs to an user
   * @param {*} belongsTo
   */
  create(belongsTo) {
    return new Promise((resolve, reject) => {
      const bank = new BankModel({
        belongsTo: belongsTo._id,
        lastSet: new Date(),
      });

      return bank.save((err) => {
        if (err) {
          return reject('Server error');
        }

        return resolve(bank);
      });
    });
  }

  /**
   * Get query for update bank
   * @param {*} method
   * @param {*} amount
   */
  getQuery(method, amount) {
    if (method === 'get') {
      return {
        $inc: { amount },
        lastGet: new Date(),
      };
    }

    return {
      $inc: { amount },
      lastSet: new Date(),
    };
  }

  /**
   * Update bank for a given query
   * @param {*} bankId
   * @param {*} query
   */
  update(bankId, query) {
    return new Promise((resolve, reject) => {
      BankModel.findByIdAndUpdate(bankId, query, { new: true }).exec((err, bank) => {
        if (err) {
          return reject('Server error');
        }

        return resolve(bank);
      });
    });
  }

  /**
   * Checks if an user can withdraw from his own bank
   * rejects if he cant, resolve if he can
   * @param {*} userId
   * @param {*} guildId
   * @param {*} amount
   */
  canWithdraw(userId, guildId, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.get(userId, guildId);

        if (amount > client.bank.amount) {
          return reject(false);
        }

        return resolve(true);
      } catch (e) {
        return reject(false);
      }
    });
  }

  /**
   * Check if you are allowed to withdraw or send money to your bank
   * @param {*} method
   * @param {*} userId
   * @param {*} guildId
   * @param {*} date
   */
  allow(method, date, user) {
    if (method !== 'get' || method !== 'push') {
      throw new Error('Bank method must be either `push` or `get`');
    }

    // If you are trying to withdraw money but never set or never get
    // you can withdraw
    if ((method === 'get' && !user.bank.lastGet) || !user.bank.lastSet) {
      return true;
    }

    // Add one day to selected getter or setter
    const dayAfter = moment(method === 'push' ? user.bank.lastSet : user.bank.lastGet).add(
      1,
      'day',
    );

    // Convert date in moment format
    const date_ = moment(date);

    // Return true if you can push/get money
    return dayAfter.isBefore(date_);
  }
}

module.exports = {
  bank: new Bank(),
};
